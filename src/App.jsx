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
<<<<<<< HEAD
  Database, Home, Settings, List, Users, AlertCircle, Clipboard, Edit3, FileText, Award, Sparkles
=======
  Database, Home, Settings, List, Users, AlertCircle, Clipboard, Edit3, FileText, RefreshCw
>>>>>>> 5668f7961e71e18f5ec454e4a6d7a163a1e2492b
} from 'lucide-react';

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

// ==========================================
// 🛠️ Admin Dashboard (管理者機能強化版)
// ==========================================
const AdminDashboard = ({ db, user }) => {
  const [adminSubTab, setAdminSubTab] = useState('main'); // 'main' | 'grades' 成績表
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [adminTab, setAdminTab] = useState('schedule'); // 'schedule' or 'grades'
  
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
      
<<<<<<< HEAD
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
=======
      {/* タブ切り替え */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setAdminTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            adminTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar size={18} />
          スケジュール・出欠管理
        </button>
        <button
          onClick={() => setAdminTab('grades')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
            adminTab === 'grades'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clipboard size={18} />
          成績表
        </button>
      </div>

      {/* スケジュール管理タブ */}
      {adminTab === 'schedule' && (
        <>
      
>>>>>>> 5668f7961e71e18f5ec454e4a6d7a163a1e2492b
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

<<<<<<< HEAD
=======
      {/* 成績表タブ */}
      {adminTab === 'grades' && (
        <GradesManagement db={db} />
      )}

>>>>>>> 5668f7961e71e18f5ec454e4a6d7a163a1e2492b
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
<<<<<<< HEAD
// 📊 成績表（管理者用）
// ==========================================
const AdminGradeSheet = ({ db, events, getUniqueAttendees }) => {
  const [filterMonth, setFilterMonth] = useState(null); // null = 全期間
  const [selectedPerson, setSelectedPerson] = useState(null); // クリックした氏名 → 詳細モーダル用

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
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">データがありません</td></tr>
            ) : (
              stats.map((row, i) => {
                const total = row.ok + row.ng + row.maybe;
                const rate = total > 0 ? Math.round((row.ok / total) * 100) : 0;
                return (
                  <tr
                    key={row.name}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition cursor-pointer`}
                    onClick={() => setSelectedPerson({ name: row.name })}
                  >
                    <td className="p-3 font-medium text-slate-800 underline decoration-blue-400 decoration-1 underline-offset-1">{row.name}</td>
                    <td className="p-3 text-right text-green-700">{row.ok}</td>
                    <td className="p-3 text-right text-red-600">{row.ng}</td>
                    <td className="p-3 text-right text-yellow-700">{row.maybe}</td>
                    <td className="p-3 text-right font-bold text-slate-700">{rate}%</td>
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

      {/* 氏名クリック時: 体力測定成績入力ページ */}
      {selectedPerson && (
        <FitnessTestModal
          personName={selectedPerson.name}
          db={db}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
};

// 1回分のデータは test_item id をキーに { avg, result }
const emptyRound = () => ({});

// 体力測定成績モーダル（年4回・Firebase test_items のカテゴリ・名前を表示）
const FitnessTestModal = ({ personName, db, onClose }) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
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
              order: data.order ?? 0
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
    lines.push(`${personName} さん ${year}年度 体力測定データ（同年代平均 vs 今回結果）`);
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
              content: `あなたは児童・生徒の体力測定を分析し、その結果を保護者に伝える専門家です。読み手は保護者であり、「お子さんの成長を実感し、喜びや安心を感じてもらう」ことを第一の目的としてください。感動とまではいかなくても、心が温まる・うれしくなるような、EQの高い文章にしてください。

【トーン・文体】
・温かく、寄り添うような語りかけ。保護者の気持ちに共感しつつ、お子さんの頑張りや成長を具体的に伝える。
・「〜ですね」「〜がうかがえます」「お子さんの〜が伝わってきます」など、相手を意識した柔らかい表現を使う。
・良い変化には「うれしいですね」「頼もしいです」「しっかり伸びています」など、喜びや称賛を素直に込める。課題があっても「これからが楽しみです」「次回の伸びに期待できます」など前向きに締める。
・文字数制限は設けていません。分析できる限り、種目ごとの変化や成長を丁寧に文章で表現してください。短くまとめすぎず、保護者が「わが子の成長」をしっかり感じ取れる長さで書いてください。

【表現のルール】
・分析の主軸は「前回・前々回との比較（回を追った変化）」とし、信頼しやすい具体的な数値で書く。
・身長: 例「1回目151cmから2回目151.2cmで2mm伸びています。少しずつ背が伸びている様子がうかがえます。」
・その他も「1回目○→2回目○で△△しています」のように前回との比較で書く。平均に触れる場合は補足程度に。

【重要：種目ごとの「良い方向」の基準】
・俊敏性（7mラン）: タイムなので数値が小さいほど良い。4.3→4.1なら「俊敏性は向上している」と書く。「低下」と誤らないこと。
・身長: 数値が大きい＝伸びている。前回より○cm/○mm伸びている、と表現。
・筋力（腹筋）・瞬発力（立ち幅跳び・座り幅跳び）: 数値が大きいほど良い。
・柔軟性（長座体前屈）: 数値が大きいほど良い。
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
      setAnalysisResult(text || '分析結果を取得できませんでした。');
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
      await setDoc(ref, {
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
      }, { merge: true });
      alert('保存しました。');
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
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">年度:</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
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
              {fixedRows.map((item) => (
                <tr key={item.id}>
                  <td className="border border-slate-200 p-2 bg-slate-50">
                    <span className="font-bold text-slate-800 block">{item.category}</span>
                    {item.name ? <span className="text-xs text-slate-500 block">{item.name}</span> : null}
                  </td>
                  {[0, 1, 2, 3].map(ri => (
                    <React.Fragment key={ri}>
                      <td className="border border-slate-200 p-1">
                        <input type="text" inputMode="decimal" className="w-full border border-slate-200 rounded px-2 py-1.5 text-center text-sm" placeholder="—"
                          value={getRoundValue(ri, item.id, 'avg')} onChange={e => handleRoundChange(ri, item.id, 'avg', e.target.value)} />
                      </td>
                      <td className="border border-slate-200 p-1 bg-blue-50/50">
                        <input type="text" inputMode="decimal" className="w-full border border-blue-200 rounded px-2 py-1.5 text-center text-sm font-medium" placeholder="—"
                          value={getRoundValue(ri, item.id, 'result')} onChange={e => handleRoundChange(ri, item.id, 'result', e.target.value)} />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
              {/* Firestore test_items の項目 */}
              {testItems.map((item) => (
                <tr key={item.id}>
                  <td className="border border-slate-200 p-2 bg-slate-50">
                    <span className="font-bold text-slate-800 block">{item.category}</span>
                    <span className="text-xs text-slate-500 block">{item.name}</span>
                  </td>
                  {[0, 1, 2, 3].map(ri => (
                    <React.Fragment key={ri}>
                      <td className="border border-slate-200 p-1">
                        <input type="text" inputMode="decimal" className="w-full border border-slate-200 rounded px-2 py-1.5 text-center text-sm" placeholder="—"
                          value={getRoundValue(ri, item.id, 'avg')} onChange={e => handleRoundChange(ri, item.id, 'avg', e.target.value)} />
                      </td>
                      <td className="border border-slate-200 p-1 bg-blue-50/50">
                        <input type="text" inputMode="decimal" className="w-full border border-blue-200 rounded px-2 py-1.5 text-center text-sm font-medium" placeholder="—"
                          value={getRoundValue(ri, item.id, 'result')} onChange={e => handleRoundChange(ri, item.id, 'result', e.target.value)} />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-400 mt-3">※ 身長・体重は常に表示。その他は Firestore の test_items から取得しています。同年代平均は参考値、今回結果はその回の測定値を入力してください。</p>

          {/* AI分析結果 */}
          {(analysisResult || analysisLoading) && (
            <div className="mt-6 p-4 rounded-xl border border-violet-200 bg-violet-50/50">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-violet-600"/> AI分析
              </h4>
              {analysisLoading ? (
                <p className="text-slate-500">分析中...</p>
              ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{analysisResult}</div>
              )}
              <p className="text-xs text-slate-400 mt-2">※ 入力データはOpenAI APIに送信されます。APIキーは .env の VITE_OPENAI_API_KEY で設定してください。</p>
            </div>
          )}
        </div>
      </div>
=======
// 📊 成績表管理
// ==========================================
const GradesManagement = ({ db }) => {
  const [students, setStudents] = useState([]);
  const [testCategories, setTestCategories] = useState([]);
  const [testItems, setTestItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gradeInputs, setGradeInputs] = useState({});
  const [existingGrades, setExistingGrades] = useState([]);

  // 生徒リストを取得
  useEffect(() => {
    const q = collection(db, "students");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
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
          }
        }
        
        if (name && typeof name === 'string' && name.trim() !== '') {
          studentList.push({ id: doc.id, name: name.trim() });
        }
      });
      
      studentList.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      setStudents(studentList);
    });
    return () => unsubscribe();
  }, [db]);

  // テストカテゴリを取得
  useEffect(() => {
    const q = collection(db, "test_categories");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categories = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        let categoryLabel = null;
        if (data && typeof data === 'object') {
          if (data.label) {
            categoryLabel = data.label;
          } else if (data.name) {
            categoryLabel = data.name;
          } else if (data.key) {
            categoryLabel = data.key;
          }
        }
        
        if (categoryLabel && typeof categoryLabel === 'string' && categoryLabel.trim() !== '') {
          categories.push({ id: doc.id, label: categoryLabel.trim() });
        }
      });
      
      setTestCategories(categories);
    });
    return () => unsubscribe();
  }, [db]);

  // 種目名を取得
  useEffect(() => {
    const q = collection(db, "test_item_names");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        let itemName = null;
        if (data && typeof data === 'object') {
          if (data.name) {
            itemName = data.name;
          } else if (data.label) {
            itemName = data.label;
          } else if (data.itemName) {
            itemName = data.itemName;
          }
        }
        
        if (itemName && typeof itemName === 'string' && itemName.trim() !== '') {
          items.push({ id: doc.id, name: itemName.trim() });
        }
      });
      
      setTestItems(items);
    });
    return () => unsubscribe();
  }, [db]);

  // 既存の成績を取得
  useEffect(() => {
    const q = query(collection(db, "grades"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gradeList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate()
      }));
      setExistingGrades(gradeList);
    });
    return () => unsubscribe();
  }, [db]);

  // 入力値の変更
  const handleScoreChange = (studentName, value) => {
    setGradeInputs(prev => ({
      ...prev,
      [studentName]: value
    }));
  };

  // 一括保存
  const handleBulkSave = async () => {
    if (!selectedCategory || !selectedItem) {
      alert('テストカテゴリと種目名を選択してください');
      return;
    }

    const entries = Object.entries(gradeInputs).filter(([_, score]) => score && score.trim() !== '');
    
    if (entries.length === 0) {
      alert('少なくとも1つの成績を入力してください');
      return;
    }

    if (!window.confirm(`${entries.length}件の成績を保存しますか？`)) {
      return;
    }

    try {
      const batch = writeBatch(db);
      
      entries.forEach(([studentName, score]) => {
        const docRef = doc(collection(db, "grades"));
        batch.set(docRef, {
          studentName,
          category: selectedCategory,
          itemName: selectedItem,
          title: `${selectedCategory} - ${selectedItem}`,
          score: Number(score),
          date: new Date(date),
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      alert(`${entries.length}件の成績を保存しました`);
      setGradeInputs({});
    } catch (error) {
      console.error('成績保存エラー:', error);
      alert('成績保存エラー: ' + error.message);
    }
  };

  return (
    <div>
      {/* 条件選択エリア */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Clipboard size={20} className="text-green-600"/> 成績一括入力
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">テストカテゴリ</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">選択してください</option>
              {testCategories.map(cat => (
                <option key={cat.id} value={cat.label}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">種目名</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">選択してください</option>
              {testItems.map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 block mb-2">実施日</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleBulkSave}
            disabled={!selectedCategory || !selectedItem}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-bold shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Database size={16} />
            一括保存
          </button>
        </div>
      </div>

      {/* 成績入力表 */}
      {selectedCategory && selectedItem && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-4">
            {selectedCategory} - {selectedItem}
          </h3>

          {students.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              生徒が登録されていません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 px-4 py-3 text-left text-sm font-bold text-slate-700">No.</th>
                    <th className="border border-slate-300 px-4 py-3 text-left text-sm font-bold text-slate-700">生徒名</th>
                    <th className="border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700 w-40">点数</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    // 既存の成績を確認
                    const existingGrade = existingGrades.find(g => 
                      g.studentName === student.name && 
                      g.category === selectedCategory && 
                      g.itemName === selectedItem
                    );

                    return (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 px-4 py-3 text-sm text-slate-600">
                          {index + 1}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800">
                          {student.name}
                        </td>
                        <td className="border border-slate-300 px-4 py-3">
                          <input
                            type="number"
                            value={gradeInputs[student.name] || ''}
                            onChange={(e) => handleScoreChange(student.name, e.target.value)}
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                            placeholder={existingGrade ? `前回: ${existingGrade.score}` : '点数'}
                            min="0"
                            max="100"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
>>>>>>> 5668f7961e71e18f5ec454e4a6d7a163a1e2492b
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
