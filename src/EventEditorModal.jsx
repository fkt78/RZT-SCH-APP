import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, Edit3 } from 'lucide-react';

export default function EventEditorModal({ isOpen, onClose, event, date, db, user }) {
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

  useEffect(() => {
    const q = collection(db, "locations");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locationList = [];
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        let locationName = null;
        if (data && typeof data === 'object') {
          if (data.name) locationName = data.name;
          else if (data.location) locationName = data.location;
          else if (data.場所) locationName = data.場所;
          else if (data.locationName) locationName = data.locationName;
        } else if (typeof data === 'string') locationName = data;
        if (locationName && typeof locationName === 'string' && locationName.trim() !== '') {
          locationList.push(locationName.trim());
        }
      });
      const uniqueLocations = [...new Set(locationList)];
      uniqueLocations.sort((a, b) => a.localeCompare(b, 'ja'));
      setLocations(uniqueLocations);
      if (!event && uniqueLocations.length > 0 && !location) setLocation(uniqueLocations[0]);
    }, (error) => console.error("場所データ取得エラー:", error));
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
    const data = { title, start, end, location, creatorId: user.uid, updatedAt: serverTimestamp() };
    if (event) {
      await updateDoc(doc(db, "schedules", event.id), data);
    } else {
      await addDoc(collection(db, "schedules"), { ...data, createdAt: serverTimestamp(), attendees: [] });
    }
    onClose();
  };

  if (!isOpen) return null;

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
              <select value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">選択してください</option>
                {locations.map((loc, index) => (
                  <option key={index} value={loc}>{loc}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="場所を入力..." />
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
}
