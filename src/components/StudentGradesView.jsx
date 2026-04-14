import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { Award, Clipboard, BarChart2, Share2, Sparkles } from 'lucide-react';
import { getUnitForItem } from './studentGradesUtils';
import { StudentGradesCharts } from './StudentGradesCharts';

export default function StudentGradesView({ db, userProfile }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [gradesSubTab, setGradesSubTab] = useState('table'); // 'table' | 'graph'
  const [testItems, setTestItems] = useState([]);
  const [rounds, setRounds] = useState([{}, {}, {}, {}]);
  const [roundDates, setRoundDates] = useState(['', '', '', '']);
  const [analysisResult, setAnalysisResult] = useState(null); // 管理者が保存したAI分析結果
  const [instructorComment, setInstructorComment] = useState(null); // インストラクターからの一言
  const [rhythmTraining, setRhythmTraining] = useState({ q1: '', q2: '', q3: '', q4: '' }); // リズムトレーニングの級
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
          setInstructorComment(d.instructorComment ?? null);
          setRhythmTraining(d.rhythmTraining && typeof d.rhythmTraining === 'object'
            ? {
                q1: (d.rhythmTraining.q1 != null ? String(d.rhythmTraining.q1).trim() : ''),
                q2: (d.rhythmTraining.q2 != null ? String(d.rhythmTraining.q2).trim() : ''),
                q3: (d.rhythmTraining.q3 != null ? String(d.rhythmTraining.q3).trim() : ''),
                q4: (d.rhythmTraining.q4 != null ? String(d.rhythmTraining.q4).trim() : ''),
              }
            : { q1: '', q2: '', q3: '', q4: '' });
        } else {
          setRounds([{}, {}, {}, {}]);
          setRoundDates(['', '', '', '']);
          setAnalysisResult(null);
          setInstructorComment(null);
          setRhythmTraining({ q1: '', q2: '', q3: '', q4: '' });
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
  const hasRhythmData = rhythmTraining && (rhythmTraining.q1 || rhythmTraining.q2 || rhythmTraining.q3 || rhythmTraining.q4);

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
          ) : !hasAnyData && !hasRhythmData ? (
            <p className="text-slate-500 py-8 text-center">
              この年度の体力測定データはまだ登録されていません。管理者が入力するとここに表示されます。
              <br />
              <span className="text-xs mt-2 block">※ ログイン名と、管理者が体力測定で保存した「氏名」が一致すると表示されます。表記が違う（例: 山本一郎 / 山元イチロウ）と表示されない場合があります。</span>
            </p>
          ) : (
            <>
              {/* リズムトレーニング（級）表示 - 管理者が入力したQを生徒成績表に表示（体力データがなくても表示） */}
              {hasRhythmData && (
                <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Share2 size={18} className="text-emerald-600"/> リズム(級) リズムトレーニング
                  </h4>
                  <div className="flex flex-wrap gap-6">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">{n}回目</span>
                        <span className="text-lg font-bold text-slate-800 bg-white px-3 py-2 rounded-lg border border-emerald-200 min-w-[4rem] text-center">
                          {rhythmTraining?.[`q${n}`] || '—'}
                        </span>
                        <span className="text-xs text-slate-500">級</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 成績表タブ: 測定日 + 表 */}
              {hasAnyData && (
              <>
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
              </>
              )}
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
              {instructorComment && (
                <div className="mt-6 p-4 rounded-xl border border-sky-200 bg-sky-50/50">
                  <h4 className="font-bold text-slate-700 mb-2">インストラクターからの一言</h4>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{instructorComment}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
