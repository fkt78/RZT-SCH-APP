import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, getDoc, setDoc, writeBatch, where
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import { 
  Activity, Calendar, LogOut, Plus, 
  CheckCircle, XCircle, HelpCircle, User, Trash2, MapPin, Clock, 
  Database, Home, Settings, List, Users, AlertCircle, Clipboard, Edit3, FileText, ChevronRight
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

// --- 2. Main Application Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar'); // Default to Calendar

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

  const handleLogin = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      alert("ログインエラー: " + error.message);
    }
  };

  const handleSaveProfile = async (name) => {
    if (!user) return;
    const profile = { name, updatedAt: serverTimestamp(), role: 'member' }; 
    await setDoc(doc(db, "app_users", user.uid), profile, { merge: true });
    setUserProfile({ ...profile });
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>;

  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (!userProfile?.name) return <NameRegistration onSave={handleSaveProfile} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar / Bottom Nav */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => signOut(auth)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header activeTab={activeTab} userProfile={userProfile} />
        
        <main className="flex-1 relative bg-slate-100 overflow-hidden">
          {activeTab === 'home' && <HomeBoard db={db} user={user} userProfile={userProfile} />}
          {activeTab === 'calendar' && <CalendarView db={db} user={user} userProfile={userProfile} />}
          {activeTab === 'admin' && <AdminDashboard db={db} user={user} />}
        </main>
      </div>
    </div>
  );
}

// --- 3. Structure Components ---

const LoginScreen = ({ onLogin }) => (
  <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
    <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md text-center">
      <div className="flex justify-center mb-6">
        <div className="bg-blue-100 p-4 rounded-full">
          <Activity size={48} className="text-blue-600" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Rhythm Schedule</h1>
      <p className="text-slate-500 mb-8">レッスン日程・出欠共有アプリ</p>
      <button onClick={onLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
        はじめる
      </button>
    </div>
  </div>
);

const NameRegistration = ({ onSave }) => {
  const [name, setName] = useState('');
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-center">お名前を教えてください</h2>
        <p className="text-sm text-slate-500 mb-6 text-center">出欠リストに表示されます。</p>
        <form onSubmit={(e) => { e.preventDefault(); if(name) onSave(name); }}>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-500" placeholder="例：高野、深見母" autoFocus required />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">登録して次へ</button>
        </form>
      </div>
    </div>
  );
};

const Navigation = ({ activeTab, setActiveTab, onLogout }) => (
  <div className="md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all z-20 md:relative fixed bottom-0 w-full md:h-full h-16 border-t md:border-t-0 border-slate-800">
    <div className="p-6 hidden md:flex items-center gap-3 border-b border-slate-800">
      <Activity className="text-blue-400" size={24} />
      <span className="font-bold text-lg tracking-wide">Rhythm</span>
    </div>
    
    <nav className="flex-1 flex md:flex-col justify-around md:justify-start p-2 md:space-y-2">
      <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={24} />} label="掲示板" />
      <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={24} />} label="カレンダー" />
      <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings size={24} />} label="管理者" />
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

const Header = ({ activeTab, userProfile }) => (
  <header className="bg-white shadow-sm px-4 py-3 flex justify-between items-center z-10">
    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
      {activeTab === 'home' && <><List className="text-blue-600"/> 今月の予定・連絡</>}
      {activeTab === 'calendar' && <><Calendar className="text-blue-600"/> カレンダー</>}
      {activeTab === 'admin' && <><Users className="text-blue-600"/> 管理・集計</>}
    </h2>
    <div className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full">
      {userProfile.name} さん
    </div>
  </header>
);

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
      const others = event.attendees.filter(a => a.uid !== user.uid);
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
            const myStatus = event.attendees.find(a => a.uid === user.uid)?.status;
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
                     const myStatus = e.attendees.find(a=>a.uid===user.uid)?.status;
                     let statusColor = "bg-blue-50 text-slate-600 border-blue-100";
                     if(myStatus === 'ok') statusColor = "bg-green-100 text-green-800 border-green-200 font-bold";
                     if(myStatus === 'ng') statusColor = "bg-red-50 text-red-800 border-red-200 opacity-60";
                     if(myStatus === 'maybe') statusColor = "bg-yellow-50 text-yellow-800 border-yellow-200";

                     return (
                       <div 
                         key={e.id} 
                         onClick={(ev) => handleEventClick(ev, e)}
                         className={`text-[10px] p-1.5 rounded border truncate cursor-pointer hover:opacity-80 shadow-sm ${statusColor}`}
                       >
                         {myStatus === 'ok' && <CheckCircle size={8} className="inline mr-1"/>}
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
  const myStatus = event.attendees.find(a => a.uid === user.uid)?.status;

  const handleUpdate = async (status) => {
    const newEntry = {
      uid: user.uid, name: userProfile.name, status: status, updatedAt: new Date().toISOString()
    };
    try {
      const docRef = doc(db, "schedules", event.id);
      const others = event.attendees.filter(a => a.uid !== user.uid);
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

          <div className="border-t pt-4">
            <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1"><Users size={12}/> 参加予定のメンバー ({event.attendees.filter(a=>a.status==='ok').length}名)</div>
            <div className="flex flex-wrap gap-1">
              {event.attendees.filter(a => a.status === 'ok').length > 0 ? (
                event.attendees.filter(a => a.status === 'ok').map(a => (
                  <span key={a.uid} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border">{a.name}</span>
                ))
              ) : (
                <span className="text-xs text-slate-300">まだ参加者はいません</span>
              )}
            </div>
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
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal States
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    return () => unsub();
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
    const rows = event.attendees.map(a => {
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

      {/* 2. Notice Editor */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h3 className="font-bold text-slate-700 mb-2 text-sm flex gap-2"><FileText size={16}/> 掲示板「お読みください」の編集</h3>
        <div className="flex gap-2">
          <textarea 
            className="flex-1 p-2 border rounded text-xs h-16 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={notice} onChange={e => setNotice(e.target.value)} 
            placeholder="今月の連絡事項を入力..." 
          />
          <button onClick={handleUpdateNotice} className="bg-slate-800 text-white px-4 py-2 rounded text-xs hover:bg-slate-700 h-16">更新</button>
        </div>
      </div>

      {/* 3. Event List & Data Export */}
      <div className="flex justify-between items-end mb-3">
        <h3 className="font-bold text-slate-700 flex items-center gap-2"><List size={20}/> 出欠集計・データ吸い出し</h3>
        <button onClick={handleInjectTestData} className="text-xs text-yellow-600 underline flex items-center gap-1"><Database size={12}/> テストデータ生成</button>
      </div>
      
      <div className="space-y-4">
        {events.map(event => {
          const okCount = event.attendees.filter(a => a.status === 'ok').length;
          const ngCount = event.attendees.filter(a => a.status === 'ng').length;
          const maybeCount = event.attendees.filter(a => a.status === 'maybe').length;
          
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
                     <strong>参加者:</strong> {event.attendees.filter(a=>a.status==='ok').map(a=>a.name).join(", ")}
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

const EventEditorModal = ({ isOpen, onClose, event, date, db, user }) => {
  // If event exists, edit mode. Else, create mode.
  const [title, setTitle] = useState(event?.title || 'レッスン');
  const [targetDate, setTargetDate] = useState(
    event ? event.start.toISOString().slice(0,10) : date?.toISOString().slice(0,10)
  );
  const [startTime, setStartTime] = useState(
    event ? `${String(event.start.getHours()).padStart(2,'0')}:${String(event.start.getMinutes()).padStart(2,'0')}` : '17:00'
  );
  const [endTime, setEndTime] = useState(
    event ? `${String(event.end.getHours()).padStart(2,'0')}:${String(event.end.getMinutes()).padStart(2,'0')}` : '18:00'
  );
  const [location, setLocation] = useState(event?.location || '市民体育館');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const start = new Date(targetDate);
    const [sh, sm] = startTime.split(':');
    start.setHours(sh, sm);
    
    const end = new Date(targetDate);
    const [eh, em] = endTime.split(':');
    end.setHours(eh, em);

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
            <input type="text" value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-2 border rounded" />
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
