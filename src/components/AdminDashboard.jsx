import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, getDoc, setDoc, deleteDoc,
  serverTimestamp, getDocs, writeBatch
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import {
  Settings, Award, Edit3, FileText, List, Users, Database, Clipboard, Plus, Trash2, BarChart2
} from 'lucide-react';
import AdminStudentPasswordPanel from '../AdminStudentPasswordPanel';
import EventEditorModal from '../EventEditorModal';
import FitnessTestModal from '../FitnessTestModal';
import FitnessGraphModal from './FitnessGraphModal';
import { schedulesInWindowQuery } from '../scheduleQueryWindow';

export default function AdminDashboard({ db, user }) {
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
    const q = schedulesInWindowQuery(db, 'desc');
    const unsub = onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map(d => ({
          id: d.id, ...d.data(),
          start: d.data().start?.toDate(), end: d.data().end?.toDate(),
          attendees: d.data().attendees || []
        })));
      },
      (error) => {
        console.error('schedules 取得エラー:', error);
        toast.error(error.message || '予定の取得に失敗しました');
      }
    );
    const noticeRef = doc(db, "sys_settings", "monthly_notice");
    getDoc(noticeRef).then(s => s.exists() && setNotice(s.data().content));

    return () => {
      unsub();
    };
  }, [db]);

  const handleUpdateNotice = async () => {
    await setDoc(doc(db, "sys_settings", "monthly_notice"), { content: notice, updatedAt: serverTimestamp() });
    toast.success("お知らせを更新しました");
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
      toast.success(`【${event.title}】の参加者リストをクリップボードにコピーしました。\nExcel等に貼り付けてください。`);
    });
  };
  const handleDeduplicateAttendees = async () => {
    if (!window.confirm("すべての予定で参加者の重複を削除しますか？")) return;
    try {
      const snapshot = await getDocs(schedulesInWindowQuery(db, 'asc'));
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

      toast.success(`重複を削除しました（${updated}件の予定）`);
    } catch (error) {
      toast.error("重複削除エラー: " + error.message);
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
      toast.success("生成しました！");
    } catch (e) { toast.error(e.message); }
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
      <AdminStudentPasswordPanel db={db} />

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
function AdminGradeSheet({ db, events, getUniqueAttendees }) {
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
    navigator.clipboard.writeText(csv).then(() => toast.success("成績表をクリップボードにコピーしました。Excel等に貼り付けてください。"));
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
}
