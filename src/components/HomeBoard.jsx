import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { AlertCircle, CheckCircle, MapPin, XCircle, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { schedulesInWindowQuery } from '../scheduleQueryWindow';

function StatusButton({ active, onClick, icon, label, color }) {
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
}

export default function HomeBoard({ db, user, userProfile }) {
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = schedulesInWindowQuery(db, 'asc');
    const unsub = onSnapshot(
      q,
      (snap) => {
        const evts = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id, ...data,
            start: data.start?.toDate(), end: data.end?.toDate(),
            attendees: data.attendees || []
          };
        }).filter(e => e.start >= today);
        setEvents(evts);
      },
      (error) => {
        console.error('schedules 取得エラー:', error);
        toast.error(error.message || '予定の取得に失敗しました');
      }
    );

    const noticeRef = doc(db, "sys_settings", "monthly_notice");
    getDoc(noticeRef).then(snap => {
      if (snap.exists()) setNotice(snap.data().content);
    }).catch((err) => {
      console.error('お知らせ読み込みエラー:', err);
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
      const attendees = Array.isArray(event.attendees) ? event.attendees : [];
      const others = isAdmin
        ? attendees.filter(a => a.uid !== user.uid)
        : attendees.filter(a => a.name !== userProfile?.name);
      await updateDoc(docRef, { attendees: [...others, newEntry] });
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
        <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-2">
          <AlertCircle className="text-orange-500" size={20} />
          <h3 className="font-bold text-orange-800">お読みください</h3>
        </div>
        <div className="p-4 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
          {notice || "現在、特にお知らせはありません。"}
        </div>
      </div>

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
            const attendees = event.attendees || [];
            const myStatus = isAdmin
              ? (user?.uid ? attendees.find(a => a.uid === user.uid)?.status : undefined)
              : (userProfile?.name ? attendees.find(a => a.name === userProfile.name)?.status : undefined);
            const dateStr = event.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
            const timeStr = `${event.start.getHours()}:${String(event.start.getMinutes()).padStart(2, '0')}`;

            return (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
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
}
