import React, { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { CheckCircle, MapPin, XCircle, HelpCircle, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { schedulesInWindowQuery } from '../scheduleQueryWindow';

export default function CalendarView({ db, user, userProfile }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null); // 詳細モーダル用
  const [historyTab, setHistoryTab] = useState('upcoming'); // 'upcoming' or 'past'
  
  useEffect(() => {
    const q = schedulesInWindowQuery(db, 'asc');
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
}

// 参加登録用モーダルコンポーネント
function ParticipationModal({ event, onClose, db, user, userProfile }) {
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
    } catch (err) { toast.error(err.message); }
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
}
