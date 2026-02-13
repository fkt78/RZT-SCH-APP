import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, getDoc, getDocs, setDoc, writeBatch, where
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, setPersistence, inMemoryPersistence } from "firebase/auth";
import { 
  Activity, Calendar, LogOut, Plus, 
  CheckCircle, XCircle, HelpCircle, User, Trash2, MapPin, Clock, 
  Database, Home, Settings, List, Users, AlertCircle, Clipboard, Edit3, FileText, Award, Sparkles, RefreshCw, BarChart2, TrendingUp
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';

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

export default function App() {
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
      console.log("Auth状態変更:", currentUser?.uid);
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

  const handleLoginWithUser = async (userName, userRole) => {
    try {
      console.log("handleLoginWithUser呼び出し:", userName, userRole);
      
      // 管理者の場合はピンコード入力画面を表示
      if (userRole === 'admin') {
        console.log("管理者ログイン: ピンコードモーダルを表示");
        setPendingInstructorName(userName);
        setShowPinCodeModal(true);
        console.log("モーダル状態設定完了 - showPinCodeModal: true, pendingInstructorName:", userName);
        return;
      }
      
      // 生徒の場合は直接ログイン
      console.log("生徒ログイン: 匿名認証を開始");
      const userCredential = await signInAnonymously(auth);
      console.log("匿名認証成功:", userCredential.user.uid);
      
      const profile = { 
        name: userName, 
        updatedAt: serverTimestamp(), 
        role: userRole 
      }; 
      
      console.log("プロファイルを保存中:", profile);
      try {
        await setDoc(doc(db, "app_users", userCredential.user.uid), profile, { merge: true });
        console.log("プロファイル保存完了");
      } catch (saveError) {
        console.error("プロファイル保存エラー:", saveError);
        console.error("エラー詳細:", saveError.code, saveError.message);
        throw saveError;
      }
      
      setUserProfile({ name: userName, role: userRole });
      console.log("ユーザープロファイル設定完了");
    } catch (error) {
      console.error("ログインエラー詳細:", error);
      console.error("エラーコード:", error.code);
      console.error("エラーメッセージ:", error.message);
      alert("ログインエラー: " + (error.message || error.code || "不明なエラーが発生しました"));
    }
  };

  const handlePinCodeVerify = async (userName, pinCode) => {
    try {
      console.log("=== ピンコード検証開始 ===");
      console.log("入力されたピンコード:", pinCode);
      console.log("ユーザー名:", userName);
      
      // ピンコードをFirebaseから取得して検証
      const pinCodeRef = doc(db, "instructors", "QMlIGG4Bu6mHqgcZgcs8");
      const pinSnap = await getDoc(pinCodeRef);
      
      console.log("Firestoreからピンコードドキュメントを取得:", pinSnap.exists());
      
      let correctPin = null;
      if (pinSnap.exists()) {
        const data = pinSnap.data();
        console.log("ピンコードドキュメントのデータ:", data);
        correctPin = data.pin;
        console.log("保存されているピンコード:", correctPin);
        console.log("ピンコードの型:", typeof correctPin);
      } else {
        console.log("ピンコードドキュメントが存在しません");
        correctPin = null;
      }
      
      if (correctPin === null || correctPin === undefined || String(correctPin).trim() === "") {
        alert("ピンコードが設定されていません。管理者に確認してください。");
        return;
      }
      
      const normalizedInput = String(pinCode).trim();
      const normalizedCorrect = String(correctPin).trim();
      console.log("入力されたピンコード:", normalizedInput, "(型:", typeof normalizedInput, ")");
      console.log("正しいピンコード:", normalizedCorrect, "(型:", typeof normalizedCorrect, ")");
      console.log("比較結果:", normalizedInput === normalizedCorrect);
      
      if (normalizedInput === normalizedCorrect) {
        console.log("ピンコード認証成功 - ログイン処理を開始");
        // ピンコードが正しい場合、ログイン処理を続行
        const userCredential = await signInAnonymously(auth);
        console.log("匿名認証成功:", userCredential.user.uid);
        
        const profile = { 
          name: userName, 
          updatedAt: serverTimestamp(), 
          role: 'admin',
          pinVerified: true
        }; 
        await setDoc(doc(db, "app_users", userCredential.user.uid), profile, { merge: true });
        console.log("管理者プロファイル保存完了");
        setUserProfile({ name: userName, role: 'admin', pinVerified: true });
        setShowPinCodeModal(false);
        setPendingInstructorName(null);
        console.log("管理者ログイン完了");
      } else {
        console.error("ピンコード不一致");
        console.error("入力:", pinCode);
        alert("ピンコードが正しくありません");
      }
    } catch (error) {
      console.error("ピンコード検証エラー:", error);
      alert("ピンコード検証エラー: " + error.message);
    }
  };

  // 管理者画面へのアクセス制御
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin' && activeTab === 'admin') {
      setActiveTab('calendar'); // 管理者以外は管理者画面にアクセスできない
    }
  }, [userProfile, activeTab]);

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;

  // ピンコードモーダルを表示する場合（ユーザーがログインしていなくても表示）
  if (showPinCodeModal) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <PinCodeModal 
          onVerify={handlePinCodeVerify}
          onCancel={() => {
            setShowPinCodeModal(false);
            setPendingInstructorName(null);
          }}
          instructorName={pendingInstructorName}
          db={db}
        />
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLoginWithUser} db={db} />;
  if (!userProfile?.name) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;

  return (
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
  );
}

// --- 3. Structure Components ---

// ピンコード入力モーダル
const PinCodeModal = ({ onVerify, onCancel, instructorName, db }) => {
  const [pinCode, setPinCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pinCode.length === 4 && instructorName) {
      onVerify(instructorName, pinCode);
    } else {
      alert("ピンコードは4桁で入力してください");
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

const LoginScreen = ({ onLogin, db }) => {
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  // 生徒リストを取得（コレクション全体から）
  useEffect(() => {
    setLoadingStudents(true);
    // orderByを使わずにすべてのドキュメントを取得
    const q = collection(db, "students");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("=== 生徒データ取得開始 ===");
      console.log("生徒ドキュメント数:", snapshot.docs.length);
      
      // すべてのドキュメントから名前を抽出
      const studentList = [];
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        
        // 様々なフィールド名から名前を探す
        let name = null;
        if (data && typeof data === 'object') {
          // lastName, firstName, middleNameから名前を構築
          const lastName = data.lastName || data.苗字 || data.姓 || '';
          const firstName = data.firstName || data.名前 || data.名 || '';
          const middleName = data.middleName || data.ミドルネーム || '';
          
          // 名前のパーツを結合（middleNameが空の場合は含めない）
          const nameParts = [];
          if (lastName) nameParts.push(lastName);
          if (middleName && middleName.trim() !== '') nameParts.push(middleName);
          if (firstName) nameParts.push(firstName);
          
          if (nameParts.length > 0) {
            name = nameParts.join(' ');
          }
          // 既に結合されている名前フィールド
          else if (data.name) {
            name = data.name;
          } else if (data.名前 && !data.苗字 && !data.lastName) {
            name = data.名前;
          } else if (data.studentName) {
            name = data.studentName;
          } else if (data.fullName) {
            name = data.fullName;
          } else {
            // オブジェクトの最初の文字列値を探す（日付フィールドは除外）
            for (const key in data) {
              if (key === 'enrollmentDate' || key === 'birthDate' || key === 'createdAt' || key === 'updatedAt') {
                continue; // 日付フィールドはスキップ
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
        
        // 名前が見つかり、空でない場合は追加
        if (name && typeof name === 'string' && name.trim() !== '') {
          studentList.push(name.trim());
        }
      });
      
      // 重複を除去してソート
      const uniqueNames = [...new Set(studentList)];
      uniqueNames.sort((a, b) => a.localeCompare(b, 'ja'));
      
      console.log("=== 最終的な生徒名リスト ===", uniqueNames);
      setStudents(uniqueNames);
      setLoadingStudents(false);
    }, (error) => {
      console.error("生徒データ取得エラー:", error);
      alert("生徒データの取得に失敗しました: " + error.message);
      setLoadingStudents(false);
    });
    return () => unsubscribe();
  }, [db]);

  // 管理者リストを取得（コレクション全体から）
  useEffect(() => {
    setLoadingInstructors(true);
    // orderByを使わずにすべてのドキュメントを取得
    const q = collection(db, "instructors");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("=== 管理者データ取得開始 ===");
      console.log("管理者ドキュメント数:", snapshot.docs.length);
      
      // すべてのドキュメントから名前を抽出
      const instructorList = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // 様々なフィールド名から名前を探す（nameフィールドを優先）
        let name = null;
        if (data && typeof data === 'object') {
          // nameフィールドを最優先で取得
          if (data.name) {
            name = data.name;
          }
          // lastName, firstName, middleNameから名前を構築
          else {
            const lastName = data.lastName || data.苗字 || data.姓 || '';
            const firstName = data.firstName || data.名前 || data.名 || '';
            const middleName = data.middleName || data.ミドルネーム || '';
            
            // 名前のパーツを結合（middleNameが空の場合は含めない）
            const nameParts = [];
            if (lastName) nameParts.push(lastName);
            if (middleName && middleName.trim() !== '') nameParts.push(middleName);
            if (firstName) nameParts.push(firstName);
            
            if (nameParts.length > 0) {
              name = nameParts.join(' ');
            }
          }
          // その他の名前フィールド
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
        
        // 名前が見つかり、空でない場合は追加
        if (name && typeof name === 'string' && name.trim() !== '') {
          instructorList.push(name.trim());
        }
      });
      
      // 重複を除去してソート
      const uniqueNames = [...new Set(instructorList)];
      uniqueNames.sort((a, b) => a.localeCompare(b, 'ja'));
      
      console.log("=== 最終的な管理者名リスト ===", uniqueNames);
      setInstructors(uniqueNames);
      setLoadingInstructors(false);
    }, (error) => {
      console.error("管理者データ取得エラー:", error);
      alert("管理者データの取得に失敗しました: " + error.message);
      setLoadingInstructors(false);
    });
    return () => unsubscribe();
  }, [db]);

  const handleStudentLogin = async () => {
    if (!selectedStudent) {
      alert("生徒を選択してください");
      return;
    }
    try {
      console.log("生徒ログイン開始:", selectedStudent);
      await onLogin(selectedStudent, 'member');
      console.log("生徒ログイン完了");
    } catch (error) {
      console.error("生徒ログインエラー:", error);
      alert("ログインエラー: " + error.message);
    }
  };

  const handleInstructorLogin = async () => {
    if (!selectedInstructor) {
      alert("管理者を選択してください");
      return;
    }
    try {
      console.log("管理者ログイン開始:", selectedInstructor);
      await onLogin(selectedInstructor, 'admin');
      console.log("管理者ログイン完了（ピンコードモーダル表示）");
    } catch (error) {
      console.error("管理者ログインエラー:", error);
      alert("ログインエラー: " + error.message);
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
        
        {/* 生徒と管理者のドロップダウンを分けて表示 */}
        <div className="space-y-6">
          {/* 生徒選択 */}
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
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="">選択してください</option>
                  {students.map((userName, index) => (
                    <option key={index} value={userName}>
                      {userName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("生徒ログインボタンクリック:", selectedStudent);
                    handleStudentLogin();
                  }}
                  disabled={!selectedStudent}
                  className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  生徒としてログイン
                </button>
              </>
            )}
          </div>

          {/* 管理者選択 */}
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
                    console.log("管理者ログインボタンクリック:", selectedInstructor);
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

// --- 4. Main Views ---

// ==========================================
// 🏠 Home Board (掲示板 & リスト回答)
// ==========================================
const HomeBoard = ({ db, user, userProfile }) => {
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    // Get future events
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const q = query(collection(db, "schedules"), orderBy("start", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const evts = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, ...data, 
          start: data.start?.toDate(), end: data.end?.toDate(), 
          attendees: data.attendees || [] 
        };
      }).filter(e => e.start >= today);
      setEvents(evts);
    });

    const noticeRef = doc(db, "sys_settings", "monthly_notice");
    getDoc(noticeRef).then(snap => {
      if(snap.exists()) setNotice(snap.data().content);
    });

    return () => unsub();
  }, [db]);

  const handleUpdateStatus = async (event, status) => {
    const newEntry = {
      uid: user.uid, name: userProfile.name, status: status, updatedAt: new Date().toISOString()
    };
    try {
      const docRef = doc(db, "schedules", event.id);
      const isAdmin = userProfile?.role === 'admin';
      const others = isAdmin
        ? event.attendees.filter(a => a.uid !== user.uid)
        : event.attendees.filter(a => a.name !== userProfile?.name);
      await updateDoc(docRef, { attendees: [...others, newEntry] });
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 pb-20">
      {/* 1. お知らせボード */}
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-2">
          <AlertCircle className="text-orange-500" size={20} />
          <h3 className="font-bold text-orange-800">お読みください</h3>
        </div>
        <div className="p-4 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
          {notice || "現在、特にお知らせはありません。"}
        </div>
      </div>

      {/* 2. 直近のスケジュールリスト */}
      <div>
        <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
          <CheckCircle size={20} className="text-blue-600" /> 参加確認
          <span className="text-xs font-normal text-slate-500 ml-auto">予定リスト</span>
        </h3>
        
        <div className="space-y-3">
          {events.length === 0 && (
            <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed">予定はありません</div>
          )}
          
          {events.map(event => {
            const isAdmin = userProfile?.role === 'admin';
            const myStatus = isAdmin
              ? event.attendees.find(a => a.uid === user.uid)?.status
              : event.attendees.find(a => a.name === userProfile?.name)?.status;
            const dateStr = event.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
            const timeStr = `${event.start.getHours()}:${String(event.start.getMinutes()).padStart(2,'0')}`;

            return (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">{dateStr}</span>
                      <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 rounded">{timeStr}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1">{event.title}</h4>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                      <MapPin size={12} /> {event.location || '場所未定'}
                    </div>
                    {myStatus && (
                      <div className="mt-2 text-xs font-bold text-slate-600">
                        {myStatus === 'ok' && "あなたは参加予定です"}
                        {myStatus === 'ng' && "あなたは不参加です"}
                        {myStatus === 'maybe' && "あなたは未定です"}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 sm:border-l sm:pl-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <StatusButton active={myStatus === 'ok'} onClick={() => handleUpdateStatus(event, 'ok')} icon={<CheckCircle size={20} />} label="参加" color="green" />
                    <StatusButton active={myStatus === 'ng'} onClick={() => handleUpdateStatus(event, 'ng')} icon={<XCircle size={20} />} label="不参加" color="red" />
                     <StatusButton active={myStatus === 'maybe'} onClick={() => handleUpdateStatus(event, 'maybe')} icon={<HelpCircle size={20} />} label="未定" color="yellow" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StatusButton = ({ active, onClick, icon, label, color }) => {
  const styles = {
    green: active ? "bg-green-600 text-white ring-2 ring-green-300" : "bg-white text-slate-400 hover:bg-green-50 hover:text-green-600 border-slate-200",
    red: active ? "bg-red-500 text-white ring-2 ring-red-300" : "bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 border-slate-200",
    yellow: active ? "bg-yellow-500 text-white ring-2 ring-yellow-300" : "bg-white text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 border-slate-200",
  };
  return (
    <button onClick={onClick} className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border font-bold text-sm transition-all shadow-sm ${styles[color]}`}>
      {icon} {label}
    </button>
  );
};

// ==========================================
// 📅 Calendar View (参加登録機能付き)
// ==========================================
const CalendarView = ({ db, user, userProfile }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // 詳細モーダル用
  const [historyTab, setHistoryTab] = useState('upcoming'); // 'upcoming' or 'past'
  
  useEffect(() => {
    const q = query(collection(db, "schedules"), orderBy("start"));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ 
        id: d.id, ...d.data(), 
        start: d.data().start?.toDate(), end: d.data().end?.toDate(), 
        attendees: d.data().attendees || [] 
      })));
    });
    return () => unsub();
  }, [db]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear(), month = date.getMonth();
    return { days: new Date(year, month + 1, 0).getDate(), firstDay: new Date(year, month, 1).getDay(), year, month };
  };

  const { days, firstDay, year, month } = getDaysInMonth(currentDate);

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const isAdmin = userProfile?.role === 'admin';
  const getMyStatus = (event) => (
    isAdmin
      ? event.attendees.find((a) => a.uid === user.uid)?.status
      : event.attendees.find((a) => a.name === userProfile?.name)?.status
  );

  // 今日の日付（0時0分0秒）を取得
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 今後の参加予定（今日以降）
  const myUpcomingEvents = events
    .filter((e) => getMyStatus(e) === 'ok')
    .filter((e) => e.start >= today)
    .sort((a, b) => a.start - b.start);
  const okUpcomingEventsForAdmin = events
    .filter((e) => e.attendees.some((a) => a.status === 'ok'))
    .filter((e) => e.start >= today)
    .sort((a, b) => a.start - b.start);

  // 過去の参加履歴（今日より前）
  const myPastEvents = events
    .filter((e) => getMyStatus(e) === 'ok')
    .filter((e) => e.start < today)
    .sort((a, b) => b.start - a.start); // 新しい順
  const okPastEventsForAdmin = events
    .filter((e) => e.attendees.some((a) => a.status === 'ok'))
    .filter((e) => e.start < today)
    .sort((a, b) => b.start - a.start); // 新しい順

  return (
    <div className="flex flex-col h-full pb-16 relative">
      <div className="p-4 bg-white border-b flex justify-between items-center">
        <h3 className="font-bold text-slate-700">{year}年 {month + 1}月</h3>
        <div className="flex bg-slate-100 rounded p-1">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="px-3 py-1 hover:bg-white rounded">◀</button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 hover:bg-white rounded text-blue-600 font-bold">今日</button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="px-3 py-1 hover:bg-white rounded">▶</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded overflow-hidden">
          {['日','月','火','水','木','金','土'].map((d,i) => (
             <div key={d} className={`bg-slate-50 p-2 text-center text-xs font-bold ${i===0?'text-red-500':i===6?'text-blue-500':'text-slate-500'}`}>{d}</div>
          ))}
          {Array.from({length: firstDay}).map((_,i) => <div key={`e-${i}`} className="bg-white min-h-[80px]" />)}
          {Array.from({length: days}).map((_,i) => {
             const day = i+1;
             const daysEvents = events.filter(e => e.start.getDate()===day && e.start.getMonth()===month && e.start.getFullYear()===year);
             return (
               <div key={day} className="bg-white min-h-[80px] p-1 border-t relative hover:bg-blue-50 transition">
                 <div className="text-xs font-bold text-slate-400 mb-1">{day}</div>
                 <div className="space-y-1">
                  {daysEvents.map(e => {
                    const myStatus = getMyStatus(e);
                    let statusColor = "bg-blue-50 text-slate-600 border-blue-100";
                    let statusLabel = "";
                    
                    if(myStatus === 'ok') {
                      statusColor = "bg-green-100 text-green-800 border-green-300 font-bold ring-2 ring-green-200";
                      statusLabel = "✓ 参加";
                    }
                    if(myStatus === 'ng') {
                      statusColor = "bg-red-50 text-red-800 border-red-200 opacity-60";
                      statusLabel = "✗";
                    }
                    if(myStatus === 'maybe') {
                      statusColor = "bg-yellow-50 text-yellow-800 border-yellow-200";
                      statusLabel = "?";
                    }

                    return (
                      <div 
                        key={e.id} 
                        onClick={(ev) => handleEventClick(ev, e)}
                        className={`text-[10px] p-1.5 rounded border truncate cursor-pointer hover:opacity-80 shadow-sm ${statusColor} relative`}
                      >
                        {statusLabel && <span className="font-bold mr-1">{statusLabel}</span>}
                        {e.title}
                      </div>
                    );
                  })}
                 </div>
               </div>
             )
          })}
        </div>
      </div>

      {/* 参加予定カード */}
      <div className="p-4 bg-white border-t">
        {/* タブ切り替え */}
        <div className="flex items-center gap-4 mb-4">
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            {isAdmin ? "参加状況（全員）" : "参加状況"}
          </h4>
          <div className="flex bg-slate-100 rounded p-1 text-sm ml-auto">
            <button
              onClick={() => setHistoryTab('upcoming')}
              className={`px-3 py-1 rounded transition ${
                historyTab === 'upcoming'
                  ? 'bg-white text-blue-600 font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              今後の予定
            </button>
            <button
              onClick={() => setHistoryTab('past')}
              className={`px-3 py-1 rounded transition ${
                historyTab === 'past'
                  ? 'bg-white text-slate-700 font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              過去の履歴
            </button>
          </div>
        </div>

        {/* 今後の予定タブ */}
        {historyTab === 'upcoming' && (
          <>
            {isAdmin ? (
              okUpcomingEventsForAdmin.length === 0 ? (
                <div className="text-sm text-slate-400">今後の参加予定はありません</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {okUpcomingEventsForAdmin.map((event) => {
                    const uniqueNames = Array.from(
                      new Set(event.attendees.filter((a) => a.status === 'ok').map((a) => a.name))
                    );
                    return (
                      <button
                        key={event.id}
                        onClick={(ev) => handleEventClick(ev, event)}
                        className="text-left p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition shadow-sm"
                      >
                        <div className="text-xs text-green-700 font-bold mb-1">
                          {event.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}{" "}
                          {event.start.getHours()}:{String(event.start.getMinutes()).padStart(2, '0')}
                        </div>
                        <div className="font-bold text-slate-800 text-sm">{event.title}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin size={10} /> {event.location || '場所未定'}
                        </div>
                        {uniqueNames.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {uniqueNames.map((name) => (
                              <span key={name} className="text-[10px] bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              myUpcomingEvents.length === 0 ? (
                <div className="text-sm text-slate-400">今後の参加予定はありません</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {myUpcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={(ev) => handleEventClick(ev, event)}
                      className="text-left p-3 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 transition shadow-sm"
                    >
                      <div className="text-xs text-green-700 font-bold mb-1">
                        {event.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}{" "}
                        {event.start.getHours()}:{String(event.start.getMinutes()).padStart(2, '0')}
                      </div>
                      <div className="font-bold text-slate-800 text-sm">{event.title}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {event.location || '場所未定'}
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </>
        )}

        {/* 過去の履歴タブ */}
        {historyTab === 'past' && (
          <>
            {isAdmin ? (
              okPastEventsForAdmin.length === 0 ? (
                <div className="text-sm text-slate-400">過去の参加履歴はありません</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {okPastEventsForAdmin.map((event) => {
                    const uniqueNames = Array.from(
                      new Set(event.attendees.filter((a) => a.status === 'ok').map((a) => a.name))
                    );
                    return (
                      <button
                        key={event.id}
                        onClick={(ev) => handleEventClick(ev, event)}
                        className="text-left p-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 transition shadow-sm"
                      >
                        <div className="text-xs text-slate-600 font-bold mb-1 flex items-center gap-1">
                          <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">終了</span>
                          {event.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}{" "}
                          {event.start.getHours()}:{String(event.start.getMinutes()).padStart(2, '0')}
                        </div>
                        <div className="font-bold text-slate-800 text-sm">{event.title}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <MapPin size={10} /> {event.location || '場所未定'}
                        </div>
                        {uniqueNames.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {uniqueNames.map((name) => (
                              <span key={name} className="text-[10px] bg-white border border-slate-300 text-slate-600 px-2 py-0.5 rounded-full">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              myPastEvents.length === 0 ? (
                <div className="text-sm text-slate-400">過去の参加履歴はありません</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {myPastEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={(ev) => handleEventClick(ev, event)}
                      className="text-left p-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 transition shadow-sm"
                    >
                      <div className="text-xs text-slate-600 font-bold mb-1 flex items-center gap-1">
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">終了</span>
                        {event.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}{" "}
                        {event.start.getHours()}:{String(event.start.getMinutes()).padStart(2, '0')}
                      </div>
                      <div className="font-bold text-slate-800 text-sm">{event.title}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {event.location || '場所未定'}
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
      
      {/* 参加登録モーダル */}
      {selectedEvent && (
        <ParticipationModal 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          db={db} 
          user={user} 
          userProfile={userProfile} 
        />
      )}
    </div>
  );
};

// 参加登録用モーダルコンポーネント
const ParticipationModal = ({ event, onClose, db, user, userProfile }) => {
  const isAdmin = userProfile?.role === 'admin';
  const myStatus = isAdmin
    ? event.attendees.find(a => a.uid === user.uid)?.status
    : event.attendees.find(a => a.name === userProfile?.name)?.status;
  const uniqueOkAttendees = (() => {
    const okAttendees = event.attendees.filter(a => a.status === 'ok');
    const uniqueMap = new Map();
    okAttendees.forEach((attendee) => {
      if (!uniqueMap.has(attendee.name)) {
        uniqueMap.set(attendee.name, attendee);
      }
    });
    return Array.from(uniqueMap.values());
  })();

  const handleUpdate = async (status) => {
    const newEntry = {
      uid: user.uid, name: userProfile.name, status: status, updatedAt: new Date().toISOString()
    };
    try {
      const docRef = doc(db, "schedules", event.id);
      const others = isAdmin
        ? event.attendees.filter(a => a.uid !== user.uid)
        : event.attendees.filter(a => a.name !== userProfile?.name);
      await updateDoc(docRef, { attendees: [...others, newEntry] });
    } catch (err) { alert(err.message); }
  };

  const timeStr = `${event.start.getHours()}:${String(event.start.getMinutes()).padStart(2,'0')} ~ ${event.end.getHours()}:${String(event.end.getMinutes()).padStart(2,'0')}`;
  const dateStr = event.start.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-slate-800 text-white p-4 flex justify-between items-start">
          <div>
            <div className="text-blue-300 text-xs font-bold mb-1">{dateStr}</div>
            <h3 className="text-lg font-bold">{event.title}</h3>
            <div className="text-slate-300 text-xs flex items-center gap-2 mt-1">
              <Clock size={12}/> {timeStr}
              <MapPin size={12}/> {event.location || '場所未定'}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-700/50 rounded-full p-1"><XCircle size={20}/></button>
        </div>

        <div className="p-6">
          <div className="text-center text-sm font-bold text-slate-700 mb-4">参加しますか？</div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <button onClick={() => handleUpdate('ok')} className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition ${myStatus === 'ok' ? 'bg-green-600 text-white border-green-600 ring-2 ring-green-200' : 'hover:bg-green-50 text-slate-500'}`}>
              <CheckCircle size={24}/> <span className="text-xs font-bold">参加</span>
            </button>
            <button onClick={() => handleUpdate('ng')} className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition ${myStatus === 'ng' ? 'bg-red-500 text-white border-red-500 ring-2 ring-red-200' : 'hover:bg-red-50 text-slate-500'}`}>
              <XCircle size={24}/> <span className="text-xs font-bold">不参加</span>
            </button>
            <button onClick={() => handleUpdate('maybe')} className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition ${myStatus === 'maybe' ? 'bg-yellow-500 text-white border-yellow-500 ring-2 ring-yellow-200' : 'hover:bg-yellow-50 text-slate-500'}`}>
              <HelpCircle size={24}/> <span className="text-xs font-bold">未定</span>
            </button>
          </div>
          {myStatus && (
            <div className="text-center text-xs font-bold text-slate-600 mb-4">
              {myStatus === 'ok' && "あなたは参加予定です"}
              {myStatus === 'ng' && "あなたは不参加です"}
              {myStatus === 'maybe' && "あなたは未定です"}
            </div>
          )}

          <div className="border-t pt-4">
            {/* 参加予定のメンバー（管理者のみ表示） */}
            {userProfile?.role === 'admin' && (
              <>
                <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Users size={12}/> 参加予定のメンバー ({uniqueOkAttendees.length}名)</div>
                <div className="flex flex-wrap gap-1">
                  {uniqueOkAttendees.length > 0 ? (
                    uniqueOkAttendees.map(a => (
                      <span key={a.uid || a.name} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border">{a.name}</span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-300">まだ参加者はいません</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// タイム系種目か（数値が小さいほど良い＝走るタイムなど）。バランス・片足閉眼は「立っていられた秒数」なので数値が大きいほど良い＝タイム系にしない
const isTimeItem = (item) => {
  const n = (item.name || '') + (item.category || '');
  if (/バランス|片足閉眼/.test(n)) return false; // 片足閉眼立ちは秒数が長い＝良い
  return /ラン|タイム|mラン/.test(n); // 7mラン・5mランなど「走るタイム」のみ
};

// 種目ごとの表示用単位（同年代平均・今回結果に表示）。Firebase test_items の unit を優先、なければ種目から推定
const getUnitForItem = (item) => {
  const fromFirebase = item.unit != null && String(item.unit).trim() !== '';
  if (fromFirebase) return String(item.unit).trim();
  if (item.id === '_height') return 'cm';
  if (item.id === '_weight') return 'kg';
  const n = (item.name || '') + (item.category || '');
  if (/ラン|mラン/.test(n)) return '秒';
  if (/腹筋/.test(n)) return '回';
  if (/幅跳び|長座体前屈/.test(n)) return 'cm';
  if (/プレイズ|反射神経/.test(n)) return '回';
  if (/片足閉眼|バランス/.test(n)) return '秒';
  if (/リズム/.test(n)) return '回';
  return '';
};

// ==========================================
// 📈 成績グラフ（折れ線・レーダー・伸びバー）
// ==========================================
const StudentGradesCharts = ({ rounds, roundDates, allRows, getRoundValue }) => {
  const parseNum = (v) => {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  // 各種目ごとの折れ線用データ（1〜4回目の今回結果）
  const lineDataByItem = allRows.map((item) => {
    const label = item.name ? `${item.category}（${item.name}）` : item.category;
    const points = [0, 1, 2, 3].map((ri) => {
      const v = parseNum(getRoundValue(ri, item.id, 'result'));
      return { round: `${ri + 1}回目`, 値: v, label };
    }).filter((d) => d.値 != null);
    return { item, label, points };
  }).filter((d) => d.points.length >= 2);

  // レーダー用：最新回（4回目優先）の「同年代平均との比」スコア（100=平均）
  const radarData = allRows.map((item) => {
    const shortLabel = item.name || item.category || item.id;
    let score = null;
    for (let ri = 3; ri >= 0; ri--) {
      const avg = parseNum(getRoundValue(ri, item.id, 'avg'));
      const res = parseNum(getRoundValue(ri, item.id, 'result'));
      if (res != null && avg != null && avg !== 0) {
        score = isTimeItem(item) ? (avg / res) * 100 : (res / avg) * 100;
        break;
      }
    }
    if (score == null) score = 100;
    return { subject: shortLabel.length > 6 ? shortLabel.slice(0, 6) : shortLabel, value: Math.round(score), fullMark: 100 };
  }).filter((d) => d.value > 0 && d.value < 500);

  // 各種目ごとの伸び（1回目→4回目）
  const growthBarData = allRows.map((item) => {
    const label = item.name ? `${item.category}（${item.name}）` : item.category;
    const v1 = parseNum(getRoundValue(0, item.id, 'result'));
    const v4 = parseNum(getRoundValue(3, item.id, 'result'));
    if (v1 == null || v4 == null) return null;
    const delta = isTimeItem(item) ? v1 - v4 : v4 - v1;
    const fill = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#94a3b8';
    return { name: label.length > 10 ? label.slice(0, 10) + '…' : label, 伸び: delta, fill };
  }).filter(Boolean);

  // 強み・弱みリスト（レーダー100以上=強み、100未満=弱み）
  const strengths = radarData.filter((d) => d.value > 100);
  const weaknesses = radarData.filter((d) => d.value < 100);

  return (
    <div className="space-y-8">
      {/* 1. 強み・弱み（スパイダーグラフ） */}
      {radarData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600"/> 強み・弱み（スパイダーグラフ）
          </h4>
          <p className="text-xs text-slate-500 mb-3">100＝同年代平均。100より上＝<span className="text-green-600 font-medium">強み</span>（得意）、100より下＝<span className="text-amber-600 font-medium">弱み</span>（苦手）。</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 150]} tick={{ fontSize: 10 }} />
              <Radar name="スコア" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              <Tooltip formatter={(v) => [`${v}（100=平均）${v > 100 ? ' 強み' : v < 100 ? ' 弱み' : ''}`, 'スコア']} />
            </RadarChart>
          </ResponsiveContainer>
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {strengths.length > 0 && (
                <span className="text-green-700"><strong>強み:</strong> {strengths.map((d) => d.subject).join('・')}</span>
              )}
              {weaknesses.length > 0 && (
                <span className="text-amber-700"><strong>弱み:</strong> {weaknesses.map((d) => d.subject).join('・')}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. 成績の変化（折れ線グラフ） */}
      {lineDataByItem.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Activity size={18} className="text-violet-600"/> 成績の変化（折れ線グラフ）
          </h4>
          <p className="text-xs text-slate-500 mb-3">1回目〜4回目の測定結果の推移。種目ごとに表示しています。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lineDataByItem.map(({ item, label, points }) => (
              <div key={item.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-700 mb-2 truncate" title={label}>{label}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="round" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={32} />
                    <Tooltip formatter={(v) => [v, '今回結果']} />
                    <Line type="monotone" dataKey="値" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 各種目ごとの伸び（1回目→4回目） */}
      {growthBarData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart2 size={18} className="text-emerald-600"/> 各種目ごとの伸び（1回目→4回目）
          </h4>
          <p className="text-xs text-slate-500 mb-2">緑=向上・赤=低下。タイム系は短縮を正の伸びで表示しています。</p>
          <ResponsiveContainer width="100%" height={Math.max(220, growthBarData.length * 36)}>
            <BarChart data={growthBarData} layout="vertical" margin={{ left: 120, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, '伸び']} labelFormatter={(l) => `種目: ${l}`} />
              <Bar dataKey="伸び" radius={[0, 4, 4, 0]}>
                {growthBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {lineDataByItem.length === 0 && growthBarData.length === 0 && radarData.length === 0 && (
        <p className="text-slate-500 py-6 text-center">グラフ用の数値データが不足しています。2回分以上の測定結果がある種目から表示されます。</p>
      )}
    </div>
  );
};

// ==========================================
// 📈 生徒の成績グラフ表示モーダル（管理者用・任意の生徒のグラフを表示）
// ==========================================
const FitnessGraphModal = ({ personName, db, onClose }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [testItems, setTestItems] = useState([]);
  const [rounds, setRounds] = useState([{}, {}, {}, {}]);
  const [roundDates, setRoundDates] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(true);

  const docId = React.useMemo(() => {
    if (!personName) return null;
    const safe = String(personName).replace(/\s/g, '_').replace(/\//g, '_').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf_-]/g, '_');
    return `${year}_${safe}`;
  }, [year, personName]);

  const fixedRows = [
    { id: '_height', category: '身長', name: '' },
    { id: '_weight', category: '体重', name: '' }
  ];
  const allRows = [...fixedRows, ...testItems];

  const getRoundValue = (roundIndex, itemId, field) => {
    const round = rounds[roundIndex] || {};
    const item = round[itemId] || {};
    return item[field] ?? '';
  };

  useEffect(() => {
    const loadTestItems = async () => {
      try {
        const q = query(collection(db, 'test_items'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const items = [];
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.isActive !== false) {
            items.push({ id: d.id, category: data.category || '', name: data.name || '', order: data.order ?? 0 });
          }
        });
        setTestItems(items);
      } catch (e) {
        console.error('test_items 取得エラー:', e);
        setTestItems([]);
      }
    };
    loadTestItems();
  }, [db]);

  useEffect(() => {
    if (!docId || !personName) {
      setLoading(false);
      setRounds([{}, {}, {}, {}]);
      setRoundDates(['', '', '', '']);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'fitness_results', docId);
        let snap = await getDoc(ref);
        let d = snap.exists() ? snap.data() : null;
        if (!d) {
          const q = query(collection(db, 'fitness_results'), where('name', '==', personName));
          const snap2 = await getDocs(q);
          const match = snap2.docs.find(s => (s.data().year === year) || String(s.id).startsWith(year + '_'));
          d = match ? match.data() : null;
        }
        if (d) {
          setRounds([
            d.round1 && typeof d.round1 === 'object' ? d.round1 : {},
            d.round2 && typeof d.round2 === 'object' ? d.round2 : {},
            d.round3 && typeof d.round3 === 'object' ? d.round3 : {},
            d.round4 && typeof d.round4 === 'object' ? d.round4 : {}
          ]);
          setRoundDates([
            d.round1Date ? String(d.round1Date).slice(0, 10) : '',
            d.round2Date ? String(d.round2Date).slice(0, 10) : '',
            d.round3Date ? String(d.round3Date).slice(0, 10) : '',
            d.round4Date ? String(d.round4Date).slice(0, 10) : ''
          ]);
        } else {
          setRounds([{}, {}, {}, {}]);
          setRoundDates(['', '', '', '']);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [db, docId, personName, year]);

  const hasAnyData = rounds.some(r => Object.keys(r).length > 0) || roundDates.some(d => d);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl my-8 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 size={20} className="text-blue-600"/> {personName} 成績・体力グラフ
          </h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">年度:</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700">
              <XCircle size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-auto flex-1 p-4">
          {loading ? (
            <p className="text-slate-500 py-8">読み込み中...</p>
          ) : !hasAnyData ? (
            <p className="text-slate-500 py-8 text-center">この年度の体力測定データはまだ登録されていません。</p>
          ) : (
            <StudentGradesCharts rounds={rounds} roundDates={roundDates} allRows={allRows} getRoundValue={getRoundValue} />
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 📊 成績表（生徒向け・本人の体力測定を表示）
// ==========================================
const StudentGradesView = ({ db, userProfile }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [gradesSubTab, setGradesSubTab] = useState('table'); // 'table' | 'graph'
  const [testItems, setTestItems] = useState([]);
  const [rounds, setRounds] = useState([{}, {}, {}, {}]);
  const [roundDates, setRoundDates] = useState(['', '', '', '']);
  const [analysisResult, setAnalysisResult] = useState(null); // 管理者が保存したAI分析結果
  const [loading, setLoading] = useState(true);

  const personName = userProfile?.name ?? '';
  const docId = React.useMemo(() => {
    if (!personName) return null;
    const safe = String(personName).replace(/\s/g, '_').replace(/\//g, '_').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf_-]/g, '_');
    return `${year}_${safe}`;
  }, [year, personName]);

  const fixedRows = [
    { id: '_height', category: '身長', name: '' },
    { id: '_weight', category: '体重', name: '' }
  ];
  const allRows = [...fixedRows, ...testItems];

  const getRoundValue = (roundIndex, itemId, field) => {
    const round = rounds[roundIndex] || {};
    const item = round[itemId] || {};
    return item[field] ?? '';
  };

  useEffect(() => {
    const loadTestItems = async () => {
      try {
        const q = query(
          collection(db, 'test_items'),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        const items = [];
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.isActive !== false) {
            items.push({
              id: d.id,
              category: data.category || '',
              name: data.name || '',
              order: data.order ?? 0,
              unit: data.unit || ''
            });
          }
        });
        setTestItems(items);
      } catch (e) {
        console.error('test_items 取得エラー:', e);
        setTestItems([]);
      }
    };
    loadTestItems();
  }, [db]);

  useEffect(() => {
    if (!docId || !personName) {
      setLoading(false);
      setRounds([{}, {}, {}, {}]);
      setRoundDates(['', '', '', '']);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'fitness_results', docId);
        let snap = await getDoc(ref);
        let d = snap.exists() ? snap.data() : null;
        if (!d) {
          const q = query(collection(db, 'fitness_results'), where('name', '==', personName));
          const snap2 = await getDocs(q);
          const match = snap2.docs.find(s => (s.data().year === year) || String(s.id).startsWith(year + '_'));
          d = match ? match.data() : null;
        }
        if (d) {
          const r1 = d.round1 && typeof d.round1 === 'object' ? d.round1 : {};
          const r2 = d.round2 && typeof d.round2 === 'object' ? d.round2 : {};
          const r3 = d.round3 && typeof d.round3 === 'object' ? d.round3 : {};
          const r4 = d.round4 && typeof d.round4 === 'object' ? d.round4 : {};
          setRounds([r1, r2, r3, r4]);
          setRoundDates([
            d.round1Date ? String(d.round1Date).slice(0, 10) : '',
            d.round2Date ? String(d.round2Date).slice(0, 10) : '',
            d.round3Date ? String(d.round3Date).slice(0, 10) : '',
            d.round4Date ? String(d.round4Date).slice(0, 10) : ''
          ]);
          setAnalysisResult(d.analysisResult ?? null);
        } else {
          setRounds([{}, {}, {}, {}]);
          setRoundDates(['', '', '', '']);
          setAnalysisResult(null);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [db, docId, personName, year]);

  if (!personName) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500">表示する成績がありません。ログイン名で成績を表示します。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  const hasAnyData = rounds.some(r => Object.keys(r).length > 0) || roundDates.some(d => d);

  return (
    <div className="p-4 md:p-6 overflow-auto h-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Award size={20} className="text-amber-500"/> 体力測定成績（年4回）
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setGradesSubTab('table')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${gradesSubTab === 'table' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Clipboard size={16} /> 成績表
              </button>
              <button
                type="button"
                onClick={() => setGradesSubTab('graph')}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${gradesSubTab === 'graph' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <BarChart2 size={16} /> 成績グラフ
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 font-medium">年度:</span>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="p-4">
          {gradesSubTab === 'graph' && hasAnyData ? (
            <StudentGradesCharts
              rounds={rounds}
              roundDates={roundDates}
              allRows={allRows}
              getRoundValue={getRoundValue}
            />
          ) : !hasAnyData ? (
            <p className="text-slate-500 py-8 text-center">
              この年度の体力測定データはまだ登録されていません。管理者が入力するとここに表示されます。
              <br />
              <span className="text-xs mt-2 block">※ ログイン名と、管理者が体力測定で保存した「氏名」が一致すると表示されます。表記が違う（例: 山本一郎 / 山元イチロウ）と表示されない場合があります。</span>
            </p>
          ) : (
            <>
              {/* 成績表タブ: 測定日 + 表 */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-bold text-slate-600 mb-2">各回の測定日</p>
                <div className="flex flex-wrap gap-4 items-center">
                  {[0, 1, 2, 3].map(ri => (
                    <div key={ri} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{ri + 1}回目</span>
                      <span className="text-sm text-slate-800">{roundDates[ri] || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th className="border border-slate-300 p-2 bg-slate-100 font-bold text-slate-700 text-left w-36" rowSpan={2}>種目</th>
                      {[1, 2, 3, 4].map(n => (
                        <th key={n} className="border border-slate-300 p-2 bg-slate-100 font-bold text-slate-700 text-center" colSpan={2}>{n}回目</th>
                      ))}
                    </tr>
                    <tr>
                      {[0, 1, 2, 3].map(ri => (
                        <React.Fragment key={ri}>
                          <th className="border border-slate-300 p-1.5 bg-slate-50 text-slate-600 text-center text-xs w-24">同年代平均</th>
                          <th className="border border-slate-300 p-1.5 bg-blue-50 text-blue-800 font-bold text-center text-xs w-24">今回結果</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fixedRows.map((item) => {
                      const unit = getUnitForItem(item);
                      const unitSuffix = unit ? ` ${unit}` : '';
                      return (
                        <tr key={item.id}>
                          <td className="border border-slate-200 p-2 bg-slate-50">
                            <span className="font-bold text-slate-800 block">{item.category}{unit ? ` (${unit})` : ''}</span>
                            {item.name ? <span className="text-xs text-slate-500 block">{item.name}</span> : null}
                          </td>
                          {[0, 1, 2, 3].map(ri => (
                            <React.Fragment key={ri}>
                              <td className="border border-slate-200 p-2 text-center text-slate-700">{getRoundValue(ri, item.id, 'avg') ? getRoundValue(ri, item.id, 'avg') + unitSuffix : '—'}</td>
                              <td className="border border-slate-200 p-2 text-center font-medium text-blue-800 bg-blue-50/30">{getRoundValue(ri, item.id, 'result') ? getRoundValue(ri, item.id, 'result') + unitSuffix : '—'}</td>
                            </React.Fragment>
                          ))}
                        </tr>
                      );
                    })}
                    {testItems.map((item) => {
                      const unit = getUnitForItem(item);
                      const unitSuffix = unit ? ` ${unit}` : '';
                      return (
                        <tr key={item.id}>
                          <td className="border border-slate-200 p-2 bg-slate-50">
                            <span className="font-bold text-slate-800 block">{item.category}{unit ? ` (${unit})` : ''}</span>
                            <span className="text-xs text-slate-500 block">{item.name}</span>
                          </td>
                          {[0, 1, 2, 3].map(ri => (
                            <React.Fragment key={ri}>
                              <td className="border border-slate-200 p-2 text-center text-slate-700">{getRoundValue(ri, item.id, 'avg') ? getRoundValue(ri, item.id, 'avg') + unitSuffix : '—'}</td>
                              <td className="border border-slate-200 p-2 text-center font-medium text-blue-800 bg-blue-50/30">{getRoundValue(ri, item.id, 'result') ? getRoundValue(ri, item.id, 'result') + unitSuffix : '—'}</td>
                            </React.Fragment>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* 管理者が保存したAI分析結果（生徒も表示可能） */}
              {analysisResult && (
                <div className="mt-6 p-4 rounded-xl border border-violet-200 bg-violet-50/50">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                    <Sparkles size={18} className="text-violet-600"/> AI分析
                  </h4>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{analysisResult}</div>
                  <p className="text-xs text-slate-400 mt-2">※ 管理者が体力測定画面でAI分析を実行すると、ここに表示されます。</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🛠️ Admin Dashboard (管理者機能強化版)
// ==========================================
const AdminDashboard = ({ db, user }) => {
  const [adminSubTab, setAdminSubTab] = useState('main'); // 'main' | 'grades' 成績表
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal States
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const getUniqueAttendees = (attendees) => {
    const uniqueMap = new Map();
    attendees.forEach((attendee) => {
      if (!attendee?.name) return;
      if (!uniqueMap.has(attendee.name)) {
        uniqueMap.set(attendee.name, attendee);
      }
    });
    return Array.from(uniqueMap.values());
  };
  const getUpdatedAtValue = (attendee) => {
    if (!attendee?.updatedAt) return 0;
    if (typeof attendee.updatedAt === "string") {
      const parsed = Date.parse(attendee.updatedAt);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    if (typeof attendee.updatedAt === "number") {
      return attendee.updatedAt;
    }
    if (typeof attendee.updatedAt?.toDate === "function") {
      return attendee.updatedAt.toDate().getTime();
    }
    return 0;
  };
  const dedupeAttendeesByName = (attendees) => {
    const uniqueMap = new Map();
    attendees.forEach((attendee) => {
      if (!attendee?.name) return;
      const existing = uniqueMap.get(attendee.name);
      if (!existing) {
        uniqueMap.set(attendee.name, attendee);
        return;
      }
      const currentValue = getUpdatedAtValue(attendee);
      const existingValue = getUpdatedAtValue(existing);
      if (currentValue >= existingValue) {
        uniqueMap.set(attendee.name, attendee);
      }
    });
    return Array.from(uniqueMap.values());
  };

  useEffect(() => {
    const q = query(collection(db, "schedules"), orderBy("start", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ 
        id: d.id, ...d.data(), 
        start: d.data().start?.toDate(), end: d.data().end?.toDate(), 
        attendees: d.data().attendees || [] 
      })));
    });
    const noticeRef = doc(db, "sys_settings", "monthly_notice");
    getDoc(noticeRef).then(s => s.exists() && setNotice(s.data().content));
    
    return () => {
      unsub();
    };
  }, [db]);

  const handleUpdateNotice = async () => {
    await setDoc(doc(db, "sys_settings", "monthly_notice"), { content: notice, updatedAt: serverTimestamp() });
    alert("お知らせを更新しました");
  };

  const handleDelete = async (id) => {
    if(window.confirm("この予定を削除しますか？")) await deleteDoc(doc(db, "schedules", id));
  };

  const handleExportCSV = (event) => {
    // CSV Data Generation
    const headers = ["氏名", "出欠状況", "更新日時"];
    const rows = getUniqueAttendees(event.attendees).map(a => {
      let status = "未回答";
      if (a.status === 'ok') status = "参加";
      if (a.status === 'ng') status = "不参加";
      if (a.status === 'maybe') status = "未定";
      return [a.name, status, a.updatedAt];
    });
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Copy to Clipboard (Simple implementation)
    navigator.clipboard.writeText(csvContent).then(() => {
      alert(`【${event.title}】の参加者リストをクリップボードにコピーしました。\nExcel等に貼り付けてください。`);
    });
  };
  const handleDeduplicateAttendees = async () => {
    if (!window.confirm("すべての予定で参加者の重複を削除しますか？")) return;
    try {
      const snapshot = await getDocs(collection(db, "schedules"));
      let batch = writeBatch(db);
      let ops = 0;
      let updated = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const attendees = Array.isArray(data.attendees) ? data.attendees : [];
        const deduped = dedupeAttendeesByName(attendees);
        if (deduped.length !== attendees.length) {
          batch.update(docSnap.ref, { attendees: deduped, updatedAt: serverTimestamp() });
          ops += 1;
          updated += 1;
          if (ops >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            ops = 0;
          }
        }
      }

      if (ops > 0) {
        await batch.commit();
      }

      alert(`重複を削除しました（${updated}件の予定）`);
    } catch (error) {
      alert("重複削除エラー: " + error.message);
    }
  };

  // --- Calendar Logic for Admin ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear(), month = date.getMonth();
    return { days: new Date(year, month + 1, 0).getDate(), firstDay: new Date(year, month, 1).getDay(), year, month };
  };
  const { days, firstDay, year, month } = getDaysInMonth(currentDate);

  const handleDateClick = (day) => {
    const d = new Date(year, month, day);
    setSelectedDate(d);
    setEditingEvent(null); // New Event
    setIsEditModalOpen(true);
  };

  const handleEventClick = (e, evt) => {
    e.stopPropagation();
    setEditingEvent(evt);
    setIsEditModalOpen(true);
  };

  const handleInjectTestData = async () => {
    if (!window.confirm("【テスト用】今月・来月のダミー予定と出欠データを生成しますか？")) return;
    try {
      const batch = writeBatch(db);
      const today = new Date();
      const getDate = (d, h) => { const x = new Date(today); x.setDate(today.getDate() + d); x.setHours(h,0,0,0); return x; };
      const e1 = doc(collection(db, "schedules"));
      batch.set(e1, { title: "金曜 高学年", start: getDate(2,17), end: getDate(2,18), location: "体育館", creatorId: user.uid, createdAt: serverTimestamp(), attendees: [{uid:"d1",name:"佐藤",status:"ok"},{uid:"d2",name:"鈴木",status:"ng"}] });
      const e2 = doc(collection(db, "schedules"));
      batch.set(e2, { title: "合同練習会", start: getDate(5,13), end: getDate(5,16), location: "アリーナ", creatorId: user.uid, createdAt: serverTimestamp(), attendees: [{uid:"d3",name:"田中",status:"ok"}] });
      await batch.commit();
      alert("生成しました！");
    } catch (e) { alert(e.message); }
  };


  return (
    <div className="h-full overflow-y-auto p-4 pb-20 bg-slate-100">
      
      {/* 管理者サブタブ: 管理・集計 / 成績表 */}
      <div className="flex gap-2 mb-4 bg-white rounded-xl p-1 shadow-sm border border-slate-200">
        <button
          onClick={() => setAdminSubTab('main')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition ${adminSubTab === 'main' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Settings size={18} /> 管理・集計
        </button>
        <button
          onClick={() => setAdminSubTab('grades')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition ${adminSubTab === 'grades' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Award size={18} /> 成績表
        </button>
      </div>

      {adminSubTab === 'grades' && (
        <AdminGradeSheet db={db} events={events} getUniqueAttendees={getUniqueAttendees} />
      )}

      {adminSubTab === 'main' && (
        <>
      {/* 1. Admin Calendar Area */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Edit3 size={20} className="text-blue-600"/> スケジュール編集
          </h3>
          <div className="flex bg-slate-50 rounded p-1 text-sm">
             <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="px-2 py-1 hover:bg-white rounded">◀</button>
             <span className="px-3 py-1 font-bold">{year}年 {month+1}月</span>
             <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="px-2 py-1 hover:bg-white rounded">▶</button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded overflow-hidden">
          {['日','月','火','水','木','金','土'].map((d,i) => (
             <div key={d} className={`bg-slate-50 p-1 text-center text-xs font-bold ${i===0?'text-red-500':i===6?'text-blue-500':'text-slate-500'}`}>{d}</div>
          ))}
          {Array.from({length: firstDay}).map((_,i) => <div key={`e-${i}`} className="bg-white min-h-[60px]" />)}
          {Array.from({length: days}).map((_,i) => {
             const day = i+1;
             const daysEvents = events.filter(e => e.start.getDate()===day && e.start.getMonth()===month && e.start.getFullYear()===year);
             return (
               <div key={day} onClick={() => handleDateClick(day)} className="bg-white min-h-[60px] p-1 border-t relative cursor-pointer hover:bg-blue-50 transition group">
                 <div className="text-xs font-bold text-slate-400 mb-1">{day}</div>
                 <div className="space-y-1">
                   {daysEvents.map(e => (
                     <div key={e.id} onClick={(ev) => handleEventClick(ev, e)} className="text-[10px] p-1 rounded bg-blue-100 text-blue-800 truncate hover:bg-blue-200">
                       {e.title}
                     </div>
                   ))}
                 </div>
                 <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-blue-400"><Plus size={14}/></div>
               </div>
             )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">※日付をクリックして新規作成、予定クリックで編集・削除</p>
      </div>

      {/* 3. Notice Editor */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h3 className="font-bold text-slate-700 mb-3 text-sm flex gap-2"><FileText size={16}/> 掲示板「お読みください」の編集</h3>
        <div className="flex gap-2">
          <textarea 
            className="flex-1 p-3 border rounded text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" 
            value={notice} onChange={e => setNotice(e.target.value)} 
            placeholder="今月の連絡事項を入力..." 
          />
          <button onClick={handleUpdateNotice} className="bg-slate-800 text-white px-6 py-2 rounded text-sm hover:bg-slate-700 h-32 font-bold">更新</button>
        </div>
      </div>

      {/* 4. Event List & Data Export */}
      <div className="flex justify-between items-end mb-3">
        <h3 className="font-bold text-slate-700 flex items-center gap-2"><List size={20}/> 出欠集計・データ吸い出し</h3>
        <div className="flex items-center gap-3">
          <button onClick={handleDeduplicateAttendees} className="text-xs text-amber-700 underline flex items-center gap-1">
            <Users size={12}/> 重複削除
          </button>
          <button onClick={handleInjectTestData} className="text-xs text-yellow-600 underline flex items-center gap-1"><Database size={12}/> テストデータ生成</button>
        </div>
      </div>
      
      <div className="space-y-4">
        {events.map(event => {
          const uniqueAttendees = getUniqueAttendees(event.attendees);
          const okCount = uniqueAttendees.filter(a => a.status === 'ok').length;
          const ngCount = uniqueAttendees.filter(a => a.status === 'ng').length;
          const maybeCount = uniqueAttendees.filter(a => a.status === 'maybe').length;
          
          return (
            <div key={event.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-3 flex justify-between items-center border-b">
                <div>
                  <div className="font-bold text-slate-800 text-sm">{event.title}</div>
                  <div className="text-xs text-slate-500">{event.start?.toLocaleDateString()} {event.start?.getHours()}:00~</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {setEditingEvent(event); setIsEditModalOpen(true);}} className="p-2 bg-white border rounded text-slate-500 hover:text-blue-600 hover:border-blue-300">
                    <Edit3 size={16}/>
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="p-2 bg-white border rounded text-slate-500 hover:text-red-500 hover:border-red-300">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>
              
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">参加: {okCount}</span>
                    <span className="text-red-500 bg-red-50 px-2 py-1 rounded">不参加: {ngCount}</span>
                    <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded">未定: {maybeCount}</span>
                  </div>
                  <button onClick={() => handleExportCSV(event)} className="flex items-center gap-1 text-xs bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700">
                    <Clipboard size={14} /> <span className="hidden sm:inline">リストをコピー</span><span className="sm:hidden">コピー</span>
                  </button>
                </div>
                
                {okCount > 0 && (
                   <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                     <strong>参加者:</strong> {uniqueAttendees.filter(a=>a.status==='ok').map(a=>a.name).join(", ")}
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      </>
      )}

      {isEditModalOpen && (
        <EventEditorModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          event={editingEvent} 
          date={selectedDate}
          db={db} 
          user={user} 
        />
      )}
    </div>
  );
};

// ==========================================
// 📊 成績表（管理者用）
// ==========================================
const AdminGradeSheet = ({ db, events, getUniqueAttendees }) => {
  const [filterMonth, setFilterMonth] = useState(null); // null = 全期間
  const [selectedPerson, setSelectedPerson] = useState(null); // クリックした氏名 → 体力測定入力モーダル用
  const [selectedPersonForGraph, setSelectedPersonForGraph] = useState(null); // グラフ表示モーダル用

  const targetEvents = React.useMemo(() => (
    filterMonth
      ? events.filter(e => e.start && e.start.getMonth() === filterMonth.getMonth() && e.start.getFullYear() === filterMonth.getFullYear())
      : events
  ), [events, filterMonth]);

  // 成績集計: 氏名 -> { name, ok, ng, maybe }
  const stats = React.useMemo(() => {
    const map = new Map();
    targetEvents.forEach(event => {
      const attendees = getUniqueAttendees(event.attendees || []);
      attendees.forEach(a => {
        if (!a?.name) return;
        if (!map.has(a.name)) map.set(a.name, { name: a.name, ok: 0, ng: 0, maybe: 0 });
        const row = map.get(a.name);
        if (a.status === 'ok') row.ok += 1;
        else if (a.status === 'ng') row.ng += 1;
        else if (a.status === 'maybe') row.maybe += 1;
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [targetEvents, getUniqueAttendees]);

  const totalEvents = targetEvents.length;

  const handleCopyCSV = () => {
    const headers = ["氏名", "参加", "不参加", "未定", "参加率(%)"];
    const rows = stats.map(s => {
      const total = s.ok + s.ng + s.maybe;
      const rate = total > 0 ? Math.round((s.ok / total) * 100) : 0;
      return [s.name, s.ok, s.ng, s.maybe, rate];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    navigator.clipboard.writeText(csv).then(() => alert("成績表をクリップボードにコピーしました。Excel等に貼り付けてください。"));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-slate-700 flex items-center gap-2">
          <Award size={20} className="text-amber-500"/> 成績表（出欠集計）
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-slate-500 font-medium">対象月:</label>
          <select
            value={filterMonth ? `${filterMonth.getFullYear()}-${filterMonth.getMonth()}` : 'all'}
            onChange={e => {
              const v = e.target.value;
              if (v === 'all') setFilterMonth(null);
              else {
                const [y, m] = v.split('-').map(Number);
                setFilterMonth(new Date(y, m, 1));
              }
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">全期間</option>
            {events.length > 0 && (() => {
              const months = new Set();
              events.forEach(e => {
                if (e.start) months.add(`${e.start.getFullYear()}-${e.start.getMonth()}`);
              });
              return Array.from(months).sort().map(key => {
                const [y, m] = key.split('-').map(Number);
                return <option key={key} value={key}>{y}年{m + 1}月</option>;
              });
            })()}
          </select>
          <button onClick={handleCopyCSV} className="flex items-center gap-1 text-xs bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700">
            <Clipboard size={14} /> CSVコピー
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left p-3 font-bold text-slate-700">氏名</th>
              <th className="text-right p-3 font-bold text-green-700">参加</th>
              <th className="text-right p-3 font-bold text-red-700">不参加</th>
              <th className="text-right p-3 font-bold text-yellow-700">未定</th>
              <th className="text-right p-3 font-bold text-slate-700">参加率</th>
              <th className="text-center p-3 font-bold text-slate-700 w-24">グラフ</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">データがありません</td></tr>
            ) : (
              stats.map((row, i) => {
                const total = row.ok + row.ng + row.maybe;
                const rate = total > 0 ? Math.round((row.ok / total) * 100) : 0;
                return (
                  <tr
                    key={row.name}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition`}
                  >
                    <td
                      className="p-3 font-medium text-slate-800 underline decoration-blue-400 decoration-1 underline-offset-1 cursor-pointer"
                      onClick={() => setSelectedPerson({ name: row.name })}
                    >
                      {row.name}
                    </td>
                    <td className="p-3 text-right text-green-700">{row.ok}</td>
                    <td className="p-3 text-right text-red-600">{row.ng}</td>
                    <td className="p-3 text-right text-yellow-700">{row.maybe}</td>
                    <td className="p-3 text-right font-bold text-slate-700">{rate}%</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedPersonForGraph({ name: row.name })}
                        className="text-xs bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 transition"
                      >
                        <BarChart2 size={14} className="inline mr-0.5" /> グラフ
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalEvents > 0 && (
        <div className="p-3 bg-slate-50 text-xs text-slate-500 border-t border-slate-200">
          対象予定数: {totalEvents}件 {filterMonth && `（${filterMonth.getFullYear()}年${filterMonth.getMonth() + 1}月）`}
        </div>
      )}

      {/* 氏名クリック時: 体力測定成績入力モーダル */}
      {selectedPerson && (
        <FitnessTestModal
          personName={selectedPerson.name}
          db={db}
          onClose={() => setSelectedPerson(null)}
        />
      )}
      {/* グラフボタンクリック時: 成績・体力グラフ表示モーダル */}
      {selectedPersonForGraph && (
        <FitnessGraphModal
          personName={selectedPersonForGraph.name}
          db={db}
          onClose={() => setSelectedPersonForGraph(null)}
        />
      )}
    </div>
  );
};

// 1回分のデータは test_item id をキーに { avg, result }
const emptyRound = () => ({});

// 生年月日から「その年度の4月1日時点の年齢」を算出（日本の学年基準）
const getAgeAsOfApril1 = (birthDate, schoolYear) => {
  if (!birthDate) return null;
  let date;
  if (birthDate && typeof birthDate.toDate === 'function') date = birthDate.toDate();
  else if (typeof birthDate === 'string') date = new Date(birthDate);
  else if (birthDate instanceof Date) date = birthDate;
  else return null;
  if (Number.isNaN(date.getTime())) return null;
  const april1 = new Date(schoolYear, 3, 1); // 4月1日
  let age = april1.getFullYear() - date.getFullYear();
  if (new Date(april1.getFullYear(), date.getMonth(), date.getDate()) > april1) age -= 1;
  return age >= 0 && age <= 20 ? age : null;
};

// 4月1日時点の年齢 → 学年（年少/年中/年長/小1〜小6）
const ageToGrade = (age) => {
  if (age == null) return '';
  const map = { 3: '年少', 4: '年中', 5: '年長', 6: '小1', 7: '小2', 8: '小3', 9: '小4', 10: '小5', 11: '小6', 12: '中1', 13: '中2', 14: '中3', 15: '高1', 16: '高2', 17: '高3' };
  return map[age] ?? '';
};

// 生徒ドキュメントから表示名を構築（ログイン画面と同じロジック）
const buildStudentDisplayName = (data) => {
  if (!data || typeof data !== 'object') return null;
  const lastName = data.lastName || data.苗字 || data.姓 || '';
  const firstName = data.firstName || data.名前 || data.名 || '';
  const middleName = data.middleName || data.ミドルネーム || '';
  const nameParts = [];
  if (lastName) nameParts.push(lastName);
  if (middleName && String(middleName).trim() !== '') nameParts.push(middleName);
  if (firstName) nameParts.push(firstName);
  if (nameParts.length > 0) return nameParts.join(' ').trim();
  if (data.name) return String(data.name).trim();
  if (data.studentName) return String(data.studentName).trim();
  if (data.fullName) return String(data.fullName).trim();
  return null;
};

// 体力測定成績モーダル（年4回・Firebase test_items のカテゴリ・名前を表示）
const FitnessTestModal = ({ personName, db, onClose }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [grade, setGrade] = useState(''); // 学年（同年代平均取得用）: 小6, 小5, 年中, 年長 など
  const [gradeFromAge, setGradeFromAge] = useState(''); // 年齢から算出した学年（表示・自動設定用）
  const [itemAveragesFromDb, setItemAveragesFromDb] = useState({}); // itemKey または itemId -> value（Firebase test_item_averages）
  const [testItems, setTestItems] = useState([]); // Firebase test_items: { id, category, name, order, ... }
  const [rounds, setRounds] = useState([{}, {}, {}, {}]); // roundIndex -> { [itemId]: { avg, result } }
  const [roundDates, setRoundDates] = useState(['', '', '', '']); // 各回の測定日 YYYY-MM-DD
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const docId = React.useMemo(() => {
    const safe = String(personName).replace(/\s/g, '_').replace(/\//g, '_').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf_-]/g, '_');
    return `${year}_${safe}`;
  }, [year, personName]);

  // Firebase test_items を取得（カテゴリ・名前表示用）
  useEffect(() => {
    const loadTestItems = async () => {
      try {
        const q = query(
          collection(db, 'test_items'),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        const items = [];
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.isActive !== false) {
            items.push({
              id: d.id,
              category: data.category || '',
              name: data.name || '',
              order: data.order ?? 0,
              unit: data.unit || ''
            });
          }
        });
        setTestItems(items);
      } catch (e) {
        console.error('test_items 取得エラー:', e);
        setTestItems([]);
      }
    };
    loadTestItems();
  }, [db]);

  // 生徒の生年月日から学年を算出し、自動で grade を設定
  useEffect(() => {
    if (!personName || !year) return;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'students'));
        let birthDate = null;
        for (const d of snap.docs) {
          const data = d.data();
          const displayName = buildStudentDisplayName(data);
          if (!displayName) continue;
          const normalized = displayName.replace(/\s+/g, ' ').trim();
          const targetNormalized = String(personName).replace(/\s+/g, ' ').trim();
          if (normalized === targetNormalized || normalized.includes(targetNormalized) || targetNormalized.includes(normalized)) {
            birthDate = data.birthDate ?? data.生年月日 ?? data.birthday;
            break;
          }
        }
        if (!birthDate) {
          setGradeFromAge('');
          return;
        }
        const age = getAgeAsOfApril1(birthDate, year);
        const inferredGrade = ageToGrade(age);
        setGradeFromAge(inferredGrade);
        if (inferredGrade) setGrade(inferredGrade); // 年齢から算出した学年で自動設定
      } catch (e) {
        console.error('生徒の年齢・学年取得エラー:', e);
        setGradeFromAge('');
      }
    };
    load();
  }, [db, personName, year]);

  // Firebase test_item_averages から各種目の平均値を取得（学年選択時）
  useEffect(() => {
    if (!grade) {
      setItemAveragesFromDb({});
      return;
    }
    const load = async () => {
      try {
        const q = query(
          collection(db, 'test_item_averages'),
          where('grade', '==', grade)
        );
        const snap = await getDocs(q);
        const byItemKey = {};  // itemKey (height_male など) -> value
        const byItemId = {};   // test_item の doc id -> value（doc id が 学年_testItemId のとき）
        snap.docs.forEach(d => {
          const data = d.data();
          const v = data.value != null ? Number(data.value) : null;
          if (v == null || !Number.isFinite(v)) return;
          const key = data.itemKey;
          if (key) byItemKey[key] = v;
          // doc id が "小6_height_male" のとき suffix は itemKey。 "年中_0qZZ..." のとき suffix は test_item id
          const suffix = d.id.startsWith(grade + '_') ? d.id.slice(grade.length + 1) : null;
          if (suffix && suffix !== key) byItemId[suffix] = v;
        });
        setItemAveragesFromDb({ byItemKey, byItemId });
      } catch (e) {
        console.error('test_item_averages 取得エラー:', e);
        setItemAveragesFromDb({});
      }
    };
    load();
  }, [db, grade]);

  // 成績データを取得
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'fitness_results', docId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          const r1 = d.round1 && typeof d.round1 === 'object' ? d.round1 : {};
          const r2 = d.round2 && typeof d.round2 === 'object' ? d.round2 : {};
          const r3 = d.round3 && typeof d.round3 === 'object' ? d.round3 : {};
          const r4 = d.round4 && typeof d.round4 === 'object' ? d.round4 : {};
          setRounds([r1, r2, r3, r4]);
          const dates = [
            d.round1Date ? String(d.round1Date).slice(0, 10) : '',
            d.round2Date ? String(d.round2Date).slice(0, 10) : '',
            d.round3Date ? String(d.round3Date).slice(0, 10) : '',
            d.round4Date ? String(d.round4Date).slice(0, 10) : ''
          ];
          setRoundDates(dates);
          setAnalysisResult(d.analysisResult ?? null);
        } else {
          setRounds([{}, {}, {}, {}]);
          setRoundDates(['', '', '', '']);
          setAnalysisResult(null);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [db, docId]);

  const handleRoundChange = (roundIndex, itemId, field, value) => {
    setRounds(prev => {
      const next = [...prev];
      const round = { ...(next[roundIndex] || {}) };
      const item = round[itemId] || { avg: '', result: '' };
      round[itemId] = { ...item, [field]: value };
      next[roundIndex] = round;
      return next;
    });
  };

  const getRoundValue = (roundIndex, itemId, field) => {
    const round = rounds[roundIndex] || {};
    const item = round[itemId] || {};
    return item[field] ?? '';
  };

  const handleRoundDateChange = (roundIndex, value) => {
    setRoundDates(prev => {
      const next = [...prev];
      next[roundIndex] = value;
      return next;
    });
  };

  // Firebase test_item_averages で読み込んだ同年代平均を、全4回の「同年代平均」欄に一括反映
  const handleApplyAveragesFromDb = () => {
    const { byItemKey = {}, byItemId = {} } = itemAveragesFromDb;
    if (Object.keys(byItemKey).length === 0 && Object.keys(byItemId).length === 0) {
      alert('学年を選んでから「同年代平均をFirebaseから読み込む」を押すか、先に「同年代平均を読み込む」で取得してください。');
      return;
    }
    const getAvgForItem = (item) => {
      if (item.id === '_height') {
        const m = byItemKey['height_male'], f = byItemKey['height_female'];
        if (m != null && f != null) return String((Number(m) + Number(f)) / 2);
        if (m != null) return String(m);
        if (f != null) return String(f);
        return '';
      }
      if (item.id === '_weight') {
        const m = byItemKey['weight_male'], f = byItemKey['weight_female'];
        if (m != null && f != null) return String((Number(m) + Number(f)) / 2);
        if (m != null) return String(m);
        if (f != null) return String(f);
        return '';
      }
      const v = byItemId[item.id] ?? byItemKey[item.id];
      return v != null ? String(v) : '';
    };
    const fixedRows = [
      { id: '_height', category: '身長', name: '' },
      { id: '_weight', category: '体重', name: '' }
    ];
    const allRowsForApply = [...fixedRows, ...testItems];
    setRounds(prev => {
      const next = prev.map(round => {
        const nextRound = { ...round };
        allRowsForApply.forEach(item => {
          const avg = getAvgForItem(item);
          if (avg) {
            const current = nextRound[item.id] || { avg: '', result: '' };
            nextRound[item.id] = { ...current, avg };
          }
        });
        return nextRound;
      });
      return next;
    });
    alert('同年代平均をFirebaseの値で反映しました。');
  };

  // Firebase に無くても常に表示する固定項目（身長・体重）
  const fixedRows = [
    { id: '_height', category: '身長', name: '' },
    { id: '_weight', category: '体重', name: '' }
  ];

  const allRows = [...fixedRows, ...testItems];

  // AI分析
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const handleAiAnalysis = async () => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      alert('AI分析を使うには、.env に VITE_OPENAI_API_KEY を設定してください。');
      return;
    }
    // 入力済みデータをテキストにまとめる
    const lines = [];
    lines.push(`${personName} さん ${year}年度 体力測定データ`);
    lines.push('【数値の意味】「平均」＝同年代平均（参考値・その子の過去の値ではない）。「今回」＝その子本人のその回の測定値（実測値）。「伸びた／増えた」は必ず「今回」どうしの比較のみ。平均と今回を混ぜて伸びの計算をしないこと。');
    lines.push('');
    allRows.forEach((item) => {
      const label = item.name ? `${item.category}（${item.name}）` : item.category;
      const rowData = [];
      [0, 1, 2, 3].forEach(ri => {
        const avg = getRoundValue(ri, item.id, 'avg');
        const res = getRoundValue(ri, item.id, 'result');
        if (avg || res) rowData.push(`${ri + 1}回目: 平均=${avg || '—'} 今回=${res || '—'}`);
      });
      if (rowData.length) lines.push(`${label}: ${rowData.join(', ')}`);
    });
    const dataText = lines.join('\n');
    if (!dataText.trim() || lines.length <= 2) {
      alert('分析するには、少なくとも1種目以上に数値を入力してください。');
      return;
    }
    setAnalysisLoading(true);
    setAnalysisResult(null);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `あなたは児童・生徒の体力測定を分析し、その結果を**お母さん（保護者）に渡す文章**を書く専門家です。読み手は「わが子の様子を知りたいお母さん」です。お母さんが読んで「この子、ここ伸びてるんだな」「ここはこれからだな」と、**感情的にすっと伝わる・心に残る**文章にしてください。EQを高く、子どもに寄り添い、お母さんにも寄り添うトーンで書いてください。

【誰のための文章か】
・この分析は**お母さんに見せる**ためのものです。お母さんが「うれしい」「安心した」「ここを応援してあげよう」と自然に思えるように、種目ごとの「伸びているところ」と「もう少し伸ばしたいところ」が感情的に伝わるように書いてください。
・「伸びた種目」では、お母さんが「よく頑張ってる」と誇らしく思えるような、喜びや称賛が伝わる表現を。「ちょっと届いていない種目」では、責めず「これから伸びる余地がある」「次が楽しみ」と前向きに伝え、お母さんが不安になりすぎないようにしてください。

【トーン・文体】
・温かく、寄り添う語りかけ。お母さんの気持ちに共感しつつ、お子さんの頑張りや成長を具体的に伝える。
・「〜ですね」「〜がうかがえます」「お子さんの〜が伝わってきます」など、相手を意識した柔らかい表現。
・**伸びている種目**：「しっかり伸びていて頼もしいです」「うれしいですね」「お子さんの〇〇、とても良く頑張っています」など、喜びや称賛が感情的に伝わるように。
・**課題やまだ伸び余地がある種目**：「もう少し伸ばしたいところ」「これからが楽しみです」「次回の伸びに期待できます」など、責めず前向きに。お母さんが「じゃあここを一緒に楽しもう」と思えるような締めに。
・文字数制限は設けません。種目ごとの「伸びた／これから」が感情的に伝わるよう、丁寧に書いてください。短くまとめすぎず、お母さんが「わが子の成長」をしっかり感じ取れる長さで。

【最重要：平均値と測定値は別物（絶対に混同しないこと）】
・**平均**＝同年代平均＝「その学年・年代の参考値」であり、**その子の過去の値ではない**。他人の平均なので、「平均から伸びた」という表現は論理的に間違いです。
・**今回**＝本人の測定値＝「その子自身がその回に計った値」だけを指す。成長や「伸びた」を語るときに使ってよいのは**この「今回」の時系列だけ**です。
・したがって「1回目の平均」と「4回目の今回」を引き算して「○cm伸びました」と書くのは**禁止**。平均はその子の過去の身長・体重ではないため、伸びの計算に使ってはいけません。

【「伸びた／増えた」の使い方（厳守）】
・「伸びている」「○cm伸びた」「○kg増えた」は、**必ず「今回」だけ**を比較して書く。つまり「1回目の今回」と「4回目の今回」など、**本人の測定値どうし**の差だけ。
・正しい例：1回目今回127cm・4回目今回160cm → 「1回目127cmから4回目160cmで33cm伸びています」（本人の測定値の時系列のみ）。
・誤り例：1回目平均127cm・4回目今回160cm を比べて「33cm伸びています」と書くのは禁止。平均は本人の値ではないので、伸びの計算に使わない。

【同年代平均との比較（別の言い方で使う）】
・平均と今回を比べるときは「平均より○cm高いです」「平均に比べて上回っています」「同年代平均○cmに対し今回○cmで、平均より高いです」など。ここでは「伸びた」は使わない。「伸びた」は本人の過去の測定値→今の測定値のときだけ。

【表現のルール】
・成長・伸びの記述は「今回」の値の時系列のみ。平均値は成長の記述に一切使わない。
・身長・体重の「伸びた／増えた」も、1回目今回〜4回目今回の**本人の測定値**だけで計算し、平均は使わない。

【種目ごとの「良い方向」の基準】
・俊敏性（7mラン等）: タイムは数値が小さいほど良い。
・身長・体重: 身長は大きい＝成長、体重は文脈に応じて。
・筋力（腹筋）・瞬発力（立ち幅跳び等）・柔軟性（長座体前屈）: 数値が大きいほど良い。
・その他タイム系: 数値が小さいほど良い。`
            },
            {
              role: 'user',
              content: dataText
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || 'APIエラー');
      const text = json.choices?.[0]?.message?.content?.trim();
      const resultText = text || '分析結果を取得できませんでした。';
      setAnalysisResult(resultText);
      try {
        const ref = doc(db, 'fitness_results', docId);
        await setDoc(ref, {
          analysisResult: resultText,
          analysisResultAt: serverTimestamp()
        }, { merge: true });
        alert('AI分析を実行し、結果をFirebaseに保存しました。\n（fitness_results / ' + docId + '）');
      } catch (saveErr) {
        console.error('AI分析結果の保存エラー:', saveErr);
        alert('AI分析結果のFirebase保存に失敗しました: ' + (saveErr?.message || String(saveErr)) + '\n\nFirestoreのルールで書き込みが許可されているか確認してください。');
      }
    } catch (e) {
      console.error(e);
      setAnalysisResult('分析に失敗しました: ' + (e.message || String(e)));
    }
    setAnalysisLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, 'fitness_results', docId);
      const payload = {
        name: personName,
        year,
        round1: rounds[0],
        round2: rounds[1],
        round3: rounds[2],
        round4: rounds[3],
        round1Date: roundDates[0] || null,
        round2Date: roundDates[1] || null,
        round3Date: roundDates[2] || null,
        round4Date: roundDates[3] || null,
        updatedAt: serverTimestamp()
      };
      if (analysisResult) {
        payload.analysisResult = analysisResult;
        payload.analysisResultAt = serverTimestamp();
      }
      await setDoc(ref, payload, { merge: true });
      alert('保存しました。' + (analysisResult ? '（AI分析結果も保存しました）' : ''));
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-slate-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl my-8 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Award size={20} className="text-amber-500"/> {personName} 体力測定成績（年4回）
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-slate-500 font-medium">年度:</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <label className="text-xs text-slate-500 font-medium">学年（同年代平均）:</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              <option value="">選択</option>
              {['小6', '小5', '小4', '小3', '年中', '年長', '年少', '中1', '中2', '中3', '高1', '高2', '高3'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            {gradeFromAge && (
              <span className="text-xs text-slate-500">（年齢から算出）</span>
            )}
            <button onClick={handleApplyAveragesFromDb} type="button" className="flex items-center gap-1 text-sm bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700">
              <Database size={14} /> 同年代平均をFirebaseから読み込む
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
            <button onClick={handleAiAnalysis} disabled={analysisLoading} className="flex items-center gap-1 text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50">
              <Sparkles size={16} /> {analysisLoading ? '分析中...' : 'AI分析'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700">
              <XCircle size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-auto flex-1 p-4">
          {/* 各回の測定日（年4回の体力測定の日付） */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-600 mb-2">各回の測定日（年4回の体力測定を行った日付）</p>
            <div className="flex flex-wrap gap-4 items-center">
              {[0, 1, 2, 3].map(ri => (
                <div key={ri} className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">{ri + 1}回目</label>
                  <input
                    type="date"
                    className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                    value={roundDates[ri]}
                    onChange={e => handleRoundDateChange(ri, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <table className="w-full text-sm border-collapse" style={{ minWidth: '600px' }}>
            <thead>
              <tr>
                <th className="border border-slate-300 p-2 bg-slate-100 font-bold text-slate-700 text-left w-36" rowSpan={2}>種目</th>
                {[1, 2, 3, 4].map(n => (
                  <th key={n} className="border border-slate-300 p-2 bg-slate-100 font-bold text-slate-700 text-center" colSpan={2}>{n}回目</th>
                ))}
              </tr>
              <tr>
                {[0, 1, 2, 3].map(ri => (
                  <React.Fragment key={ri}>
                    <th className="border border-slate-300 p-1.5 bg-slate-50 text-slate-600 text-center text-xs w-24">同年代平均</th>
                    <th className="border border-slate-300 p-1.5 bg-blue-50 text-blue-800 font-bold text-center text-xs w-24">今回結果</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 身長・体重は Firebase に無くても常に表示 */}
              {fixedRows.map((item) => {
                const unit = getUnitForItem(item);
                return (
                  <tr key={item.id}>
                    <td className="border border-slate-200 p-2 bg-slate-50">
                      <span className="font-bold text-slate-800 block">{item.category}{unit ? ` (${unit})` : ''}</span>
                      {item.name ? <span className="text-xs text-slate-500 block">{item.name}</span> : null}
                    </td>
                    {[0, 1, 2, 3].map(ri => (
                      <React.Fragment key={ri}>
                        <td className="border border-slate-200 p-1">
                          <div className="flex items-center justify-center gap-1">
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-center text-sm" placeholder="—"
                              value={getRoundValue(ri, item.id, 'avg')} onChange={e => handleRoundChange(ri, item.id, 'avg', e.target.value)} />
                            {unit ? <span className="text-slate-500 text-xs shrink-0">{unit}</span> : null}
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1 bg-blue-50/50">
                          <div className="flex items-center justify-center gap-1">
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-blue-200 rounded px-2 py-1.5 text-center text-sm font-medium" placeholder="—"
                              value={getRoundValue(ri, item.id, 'result')} onChange={e => handleRoundChange(ri, item.id, 'result', e.target.value)} />
                            {unit ? <span className="text-slate-500 text-xs shrink-0">{unit}</span> : null}
                          </div>
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                );
              })}
              {/* Firestore test_items の項目 */}
              {testItems.map((item) => {
                const unit = getUnitForItem(item);
                return (
                  <tr key={item.id}>
                    <td className="border border-slate-200 p-2 bg-slate-50">
                      <span className="font-bold text-slate-800 block">{item.category}{unit ? ` (${unit})` : ''}</span>
                      <span className="text-xs text-slate-500 block">{item.name}</span>
                    </td>
                    {[0, 1, 2, 3].map(ri => (
                      <React.Fragment key={ri}>
                        <td className="border border-slate-200 p-1">
                          <div className="flex items-center justify-center gap-1">
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-center text-sm" placeholder="—"
                              value={getRoundValue(ri, item.id, 'avg')} onChange={e => handleRoundChange(ri, item.id, 'avg', e.target.value)} />
                            {unit ? <span className="text-slate-500 text-xs shrink-0">{unit}</span> : null}
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1 bg-blue-50/50">
                          <div className="flex items-center justify-center gap-1">
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-blue-200 rounded px-2 py-1.5 text-center text-sm font-medium" placeholder="—"
                              value={getRoundValue(ri, item.id, 'result')} onChange={e => handleRoundChange(ri, item.id, 'result', e.target.value)} />
                            {unit ? <span className="text-slate-500 text-xs shrink-0">{unit}</span> : null}
                          </div>
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3">※ 身長・体重は常に表示。その他は Firestore の test_items から取得しています。同年代平均は参考値、今回結果はその回の測定値を入力してください。</p>

          {/* AI分析結果（編集可能・保存ボタンで反映） */}
          {(analysisResult != null || analysisLoading) && (
            <div className="mt-6 p-4 rounded-xl border border-violet-200 bg-violet-50/50">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-violet-600"/> AI分析
              </h4>
              {analysisLoading ? (
                <p className="text-slate-500">分析中...</p>
              ) : (
                <>
                  <textarea
                    className="w-full min-h-[200px] p-3 text-sm text-slate-700 leading-relaxed border border-violet-200 rounded-lg bg-white resize-y"
                    placeholder="AI分析の結果がここに表示されます。文章を修正してから「保存」で反映できます。"
                    value={analysisResult ?? ''}
                    onChange={e => setAnalysisResult(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">※ 上の文章は自由に編集できます。編集後に「保存」を押すとFirebaseに反映されます。</p>
                </>
              )}
              <p className="text-xs text-slate-400 mt-2">※ 入力データはOpenAI APIに送信されます。APIキーは .env の VITE_OPENAI_API_KEY で設定してください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EventEditorModal = ({ isOpen, onClose, event, date, db, user }) => {
  // If event exists, edit mode. Else, create mode.
  const [title, setTitle] = useState(event?.title || 'レッスン');
  const [locations, setLocations] = useState([]);
  const formatLocalDate = (d) => {
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [targetDate, setTargetDate] = useState(
    event ? formatLocalDate(event.start) : formatLocalDate(date)
  );
  const [startTime, setStartTime] = useState(
    event ? `${String(event.start.getHours()).padStart(2,'0')}:${String(event.start.getMinutes()).padStart(2,'0')}` : '17:00'
  );
  const [endTime, setEndTime] = useState(
    event ? `${String(event.end.getHours()).padStart(2,'0')}:${String(event.end.getMinutes()).padStart(2,'0')}` : '18:00'
  );
  const [location, setLocation] = useState(event?.location || '');

  // locationsコレクションからデータを取得
  useEffect(() => {
    const q = collection(db, "locations");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locationList = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // 様々なフィールド名から場所名を取得
        let locationName = null;
        if (data && typeof data === 'object') {
          if (data.name) {
            locationName = data.name;
          } else if (data.location) {
            locationName = data.location;
          } else if (data.場所) {
            locationName = data.場所;
          } else if (data.locationName) {
            locationName = data.locationName;
          }
        } else if (typeof data === 'string') {
          locationName = data;
        }
        
        if (locationName && typeof locationName === 'string' && locationName.trim() !== '') {
          locationList.push(locationName.trim());
        }
      });
      
      // 重複を除去してソート
      const uniqueLocations = [...new Set(locationList)];
      uniqueLocations.sort((a, b) => a.localeCompare(b, 'ja'));
      setLocations(uniqueLocations);
      
      // デフォルト値設定（新規作成時のみ）
      if (!event && uniqueLocations.length > 0 && !location) {
        setLocation(uniqueLocations[0]);
      }
    }, (error) => {
      console.error("場所データ取得エラー:", error);
    });
    return () => unsubscribe();
  }, [db, event, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const [y, m, d] = targetDate.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const [sh, sm] = startTime.split(':');
    start.setHours(Number(sh), Number(sm), 0, 0);
    
    const end = new Date(y, m - 1, d);
    const [eh, em] = endTime.split(':');
    end.setHours(Number(eh), Number(em), 0, 0);

    const data = {
      title, start, end, location, 
      creatorId: user.uid, 
      updatedAt: serverTimestamp()
    };

    if (event) {
      await updateDoc(doc(db, "schedules", event.id), data);
    } else {
      await addDoc(collection(db, "schedules"), {
        ...data, createdAt: serverTimestamp(), attendees: []
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          {event ? <><Edit3 size={20}/> 予定を編集</> : <><Plus size={20}/> 新規作成</>}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500">タイトル</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2 border rounded" required />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">日付</label>
            <input type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)} className="w-full p-2 border rounded" required />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500">開始</label>
              <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className="w-full p-2 border rounded" required />
            </div>
            <span className="self-end pb-2">~</span>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500">終了</label>
              <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} className="w-full p-2 border rounded" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">場所</label>
            {locations.length > 0 ? (
              <select 
                value={location} 
                onChange={e=>setLocation(e.target.value)} 
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">選択してください</option>
                {locations.map((loc, index) => (
                  <option key={index} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                value={location} 
                onChange={e=>setLocation(e.target.value)} 
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="場所を入力..."
              />
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 bg-gray-100 rounded text-slate-600">キャンセル</button>
            <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold shadow-md">
              {event ? '更新する' : '作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
