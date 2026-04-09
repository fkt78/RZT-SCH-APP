import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { BarChart2, XCircle } from 'lucide-react';
import { StudentGradesCharts } from './StudentGradesCharts';

export default function FitnessGraphModal({ personName, db, onClose }) {
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
}
