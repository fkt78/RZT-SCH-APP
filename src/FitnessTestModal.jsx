import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { Award, Database, Sparkles, XCircle, Printer, FileDown, Share2 } from 'lucide-react';

// 学年ドロップダウン用オプション（小1〜高3、幼稚園含む）
const GRADE_OPTIONS = ['小6', '小5', '小4', '小3', '小2', '小1', '年中', '年長', '年少', '中1', '中2', '中3', '高1', '高2', '高3'];

// 種目ごとの表示用単位
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

const getAgeAsOfApril1 = (birthDate, schoolYear) => {
  if (!birthDate) return null;
  let date;
  if (birthDate && typeof birthDate.toDate === 'function') date = birthDate.toDate();
  else if (typeof birthDate === 'string') date = new Date(birthDate);
  else if (birthDate instanceof Date) date = birthDate;
  else return null;
  if (Number.isNaN(date.getTime())) return null;
  const april1 = new Date(schoolYear, 3, 1);
  let age = april1.getFullYear() - date.getFullYear();
  if (new Date(april1.getFullYear(), date.getMonth(), date.getDate()) > april1) age -= 1;
  return age >= 0 && age <= 20 ? age : null;
};

const ageToGrade = (age) => {
  if (age == null) return '';
  const map = { 3: '年少', 4: '年中', 5: '年長', 6: '小1', 7: '小2', 8: '小3', 9: '小4', 10: '小5', 11: '小6', 12: '中1', 13: '中2', 14: '中3', 15: '高1', 16: '高2', 17: '高3' };
  return map[age] ?? '';
};

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

export default function FitnessTestModal({ personName, db, onClose }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [grade, setGrade] = useState('');
  const [gradeFromAge, setGradeFromAge] = useState('');
  const [itemAveragesFromDb, setItemAveragesFromDb] = useState({});
  const [testItems, setTestItems] = useState([]);
  const [rounds, setRounds] = useState([{}, {}, {}, {}]);
  const [roundDates, setRoundDates] = useState(['', '', '', '']);
  const [rhythmTraining, setRhythmTraining] = useState({ q1: '', q2: '', q3: '', q4: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSaving, setAnalysisSaving] = useState(false);
  const [instructorComment, setInstructorComment] = useState('');

  const docId = React.useMemo(() => {
    const safe = String(personName).replace(/\s/g, '_').replace(/\//g, '_').replace(/[^\w\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf_-]/g, '_');
    return `${year}_${safe}`;
  }, [year, personName]);

  useEffect(() => {
    const loadTestItems = async () => {
      try {
        const q = query(collection(db, 'test_items'), orderBy('order', 'asc'));
        const snap = await getDocs(q);
        const items = [];
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.isActive !== false) {
            items.push({ id: d.id, category: data.category || '', name: data.name || '', order: data.order ?? 0, unit: data.unit || '' });
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
        if (!birthDate) { setGradeFromAge(''); return; }
        const age = getAgeAsOfApril1(birthDate, year);
        const inferredGrade = ageToGrade(age);
        setGradeFromAge(inferredGrade);
        if (inferredGrade) setGrade(inferredGrade);
      } catch (e) {
        console.error('生徒の年齢・学年取得エラー:', e);
        setGradeFromAge('');
      }
    };
    load();
  }, [db, personName, year]);

  useEffect(() => {
    if (!grade) { setItemAveragesFromDb({}); return; }
    const load = async () => {
      try {
        const q = query(collection(db, 'test_item_averages'), where('grade', '==', grade));
        const snap = await getDocs(q);
        const byItemKey = {}; const byItemId = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const v = data.value != null ? Number(data.value) : null;
          if (v == null || !Number.isFinite(v)) return;
          const key = data.itemKey;
          if (key) byItemKey[key] = v;
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
          setRoundDates([
            d.round1Date ? String(d.round1Date).slice(0, 10) : '',
            d.round2Date ? String(d.round2Date).slice(0, 10) : '',
            d.round3Date ? String(d.round3Date).slice(0, 10) : '',
            d.round4Date ? String(d.round4Date).slice(0, 10) : ''
          ]);
          setAnalysisResult(d.analysisResult ?? null);
          setInstructorComment(d.instructorComment ?? '');
          setRhythmTraining(d.rhythmTraining && typeof d.rhythmTraining === 'object'
            ? { q1: d.rhythmTraining.q1 ?? '', q2: d.rhythmTraining.q2 ?? '', q3: d.rhythmTraining.q3 ?? '', q4: d.rhythmTraining.q4 ?? '' }
            : { q1: '', q2: '', q3: '', q4: '' });
        } else {
          setRounds([{}, {}, {}, {}]);
          setRoundDates(['', '', '', '']);
          setAnalysisResult(null);
          setInstructorComment('');
          setRhythmTraining({ q1: '', q2: '', q3: '', q4: '' });
        }
      } catch (e) { console.error(e); }
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
    setRoundDates(prev => { const next = [...prev]; next[roundIndex] = value; return next; });
  };

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
        if (m != null) return String(m); if (f != null) return String(f); return '';
      }
      if (item.id === '_weight') {
        const m = byItemKey['weight_male'], f = byItemKey['weight_female'];
        if (m != null && f != null) return String((Number(m) + Number(f)) / 2);
        if (m != null) return String(m); if (f != null) return String(f); return '';
      }
      const v = byItemId[item.id] ?? byItemKey[item.id];
      return v != null ? String(v) : '';
    };
    const fixedRows = [{ id: '_height', category: '身長', name: '' }, { id: '_weight', category: '体重', name: '' }];
    const allRowsForApply = [...fixedRows, ...testItems];
    setRounds(prev => prev.map(round => {
      const nextRound = { ...round };
      allRowsForApply.forEach(item => {
        const avg = getAvgForItem(item);
        if (avg) {
          const current = nextRound[item.id] || { avg: '', result: '' };
          nextRound[item.id] = { ...current, avg };
        }
      });
      return nextRound;
    }));
    alert('同年代平均をFirebaseの値で反映しました。');
  };

  const fixedRows = [{ id: '_height', category: '身長', name: '' }, { id: '_weight', category: '体重', name: '' }];
  const allRows = [...fixedRows, ...testItems];

  const handleSaveAnalysis = async () => {
    if (!docId) return;
    setAnalysisSaving(true);
    try {
      const ref = doc(db, 'fitness_results', docId);
      await setDoc(ref, { analysisResult: analysisResult ?? '', analysisResultAt: serverTimestamp(), instructorComment: instructorComment ?? '' }, { merge: true });
      alert('AI分析を保存しました。');
    } catch (e) { alert('AI分析の保存に失敗しました: ' + e.message); }
    setAnalysisSaving(false);
  };

  const handleAiAnalysis = async () => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) { alert('AI分析を使うには、.env に VITE_OPENAI_API_KEY を設定してください。'); return; }
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `あなたは児童・生徒の体力測定を分析し、その結果を**お母さん（保護者）に渡す文章**を書く専門家です。読み手は「わが子の様子を知りたいお母さん」です。お母さんが読んで「この子、ここ伸びてるんだな」「ここはこれからだな」と、**感情的にすっと伝わる・心に残る**文章にしてください。EQを高く、子どもに寄り添い、お母さんにも寄り添うトーンで書いてください。

【誰のための文章か】
・この分析は**お母さんに見せる**ためのものです。お母さんが「うれしい」「安心した」「ここを応援してあげよう」と自然に思えるように、種目ごとの「伸びているところ」と「もう少し伸ばしたいところ」が感情的に伝わるように書いてください。

【最重要：平均値と測定値は別物】
・**平均**＝同年代平均＝「その学年・年代の参考値」であり、**その子の過去の値ではない**。
・**今回**＝本人の測定値＝「その子自身がその回に計った値」だけを指す。成長や「伸びた」を語るときに使ってよいのは**この「今回」の時系列だけ**です。
・「伸びている」「○cm伸びた」は、**必ず「今回」だけ**を比較して書く。本人の測定値どうしの差だけ。` },
            { role: 'user', content: dataText }
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
        await setDoc(ref, { analysisResult: resultText, analysisResultAt: serverTimestamp() }, { merge: true });
        alert('AI分析を実行し、結果をFirebaseに保存しました。');
      } catch (saveErr) {
        console.error('AI分析結果の保存エラー:', saveErr);
        alert('AI分析結果のFirebase保存に失敗しました: ' + (saveErr?.message || String(saveErr)));
      }
    } catch (e) {
      console.error(e);
      setAnalysisResult('分析に失敗しました: ' + (e.message || String(e)));
    }
    setAnalysisLoading(false);
  };

  const escapeHtml = (s) => {
    if (s == null) return '';
    const str = String(s);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  const handlePrintScores = () => {
    const hasRoundData = (ri) => roundDates[ri] || Object.values(rounds[ri] || {}).some(v => v && v.result !== '' && v.result != null);
    const activeRounds = [0, 1, 2, 3].filter(hasRoundData);
    const hasRhythm = rhythmTraining && (rhythmTraining.q1 || rhythmTraining.q2 || rhythmTraining.q3 || rhythmTraining.q4);
    if (activeRounds.length === 0 && !hasRhythm) { alert('印刷できる成績データがありません。'); return; }
    const roundIndices = activeRounds.length > 0 ? activeRounds : [];
    const fixedRows = [{ id: '_height', category: '身長', name: '' }, { id: '_weight', category: '体重', name: '' }];
    const allRows = [...fixedRows, ...testItems];
    const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';
    const unitFor = (item) => { if (item.unit) return item.unit; if (item.id === '_height') return 'cm'; if (item.id === '_weight') return 'kg'; const n = (item.name || '') + (item.category || ''); if (/ラン|mラン/.test(n)) return '秒'; if (/腹筋/.test(n)) return '回'; if (/幅跳び|長座体前屈/.test(n)) return 'cm'; if (/片足閉眼|バランス/.test(n)) return '秒'; if (/リズム/.test(n)) return '回'; return ''; };
    const getVal = (ri, itemId, f) => { const r = rounds[ri] || {}; const i = r[itemId] || {}; return i[f] ?? ''; };
    const safeName = escapeHtml(personName || '');
    let tableRows = '';
    allRows.forEach((item) => {
      if (roundIndices.length === 0) return;
      const unit = unitFor(item);
      const label = escapeHtml(item.name ? (item.category + '（' + item.name + '）') : item.category);
      tableRows += '<tr><td style="padding:8px;border:1px solid #cbd5e1;background:#f8fafc;">' + label + (unit ? ' (' + unit + ')' : '') + '</td>';
      roundIndices.forEach((ri) => {
        const avg = escapeHtml(getVal(ri, item.id, 'avg'));
        const res = escapeHtml(getVal(ri, item.id, 'result'));
        const suffix = unit ? ' ' + unit : '';
        tableRows += '<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;">' + (avg ? avg + suffix : '—') + '</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:center;background:#eff6ff;font-weight:600;">' + (res ? res + suffix : '—') + '</td>';
      });
      tableRows += '</tr>';
    });
    const rhythmRow = hasRhythm ? '<div style="margin:16px 0;padding:12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;"><strong>リズム(級) リズムトレーニング</strong><div style="display:flex;gap:24px;margin-top:8px;flex-wrap:wrap;">' + [1,2,3,4].map((n) => '<span>' + n + '回目: <strong>' + escapeHtml(rhythmTraining?.['q'+n] || '—') + '</strong>級</span>').join('') + '</div></div>' : '';
    const headerCells = roundIndices.map((ri) => '<th colspan="2" style="padding:8px;border:1px solid #94a3b8;background:#f1f5f9;">' + (ri+1) + '回目' + (roundDates[ri] ? ' (' + escapeHtml(fmtDate(roundDates[ri])) + ')' : '') + '</th>').join('');
    const subHeaderCells = roundIndices.map(() => '<th style="padding:4px;border:1px solid #cbd5e1;font-size:11px;">同年代平均</th><th style="padding:4px;border:1px solid #cbd5e1;font-size:11px;background:#dbeafe;">今回結果</th>').join('');
    const tableSection = roundIndices.length > 0 ? '<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;"><thead><tr><th rowspan="2" style="padding:8px;border:1px solid #94a3b8;background:#e2e8f0;text-align:left;width:140px;">種目</th>' + headerCells + '</tr><tr>' + subHeaderCells + '</tr></thead><tbody>' + tableRows + '</tbody></table>' : '';
    const certStyle = '@media print{body{margin:0;} .noprint{display:none;}} .cert-wrap{position:relative;padding:40px;background:linear-gradient(135deg,#fefce8 0%,#fff 25%,#f8fafc 50%,#fff 75%,#fefce8 100%);background-size:200% 200%;} .cert-border{position:relative;border:4px double #b45309;border-radius:4px;padding:36px 32px;background:linear-gradient(to bottom,rgba(254,252,232,0.6) 0%,#fff 30%,#fff 70%,rgba(254,252,232,0.6) 100%);box-shadow:inset 0 0 0 1px #eab308;} .cert-corner{position:absolute;width:28px;height:28px;border:2px solid #b45309;opacity:0.9;} .cert-corner.tl{top:8px;left:8px;border-right:none;border-bottom:none;} .cert-corner.tr{top:8px;right:8px;border-left:none;border-bottom:none;} .cert-corner.bl{bottom:8px;left:8px;border-right:none;border-top:none;} .cert-corner.br{bottom:8px;right:8px;border-left:none;border-top:none;} .cert-ribbon{position:absolute;top:0;left:50%;transform:translateX(-50%);width:80%;height:3px;background:linear-gradient(90deg,transparent,#eab308,#b45309,#eab308,transparent);border-radius:0 0 2px 2px;} .cert-seal{display:inline-block;margin:0 12px 16px;padding:6px 14px;border:1px solid #b45309;border-radius:20px;background:linear-gradient(180deg,#fef9c3 0%,#fef08a 100%);color:#92400e;font-size:12px;font-weight:bold;letter-spacing:0.1em;}';
    const certHtml = '<div class="cert-wrap"><div class="cert-border"><div class="cert-corner tl"></div><div class="cert-corner tr"></div><div class="cert-corner bl"></div><div class="cert-corner br"></div><div class="cert-ribbon"></div><div style="text-align:center;margin-bottom:8px;"><span class="cert-seal">' + year + '年度 体力測定</span></div><h1 style="font-size:26px;margin:0 0 4px;color:#1e293b;font-weight:bold;letter-spacing:0.05em;">' + safeName + '様</h1><p style="font-size:18px;margin:0 0 20px;color:#475569;letter-spacing:0.08em;">今回の成績です</p>' + rhythmRow + tableSection + '</div></div>';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + safeName + '様 成績表</title><style>' + certStyle + '</style></head><body style="font-family:\'Hiragino Sans\',\'Yu Gothic\',sans-serif;max-width:800px;margin:0 auto;padding:24px;background:#f8fafc;">' + certHtml + '<p class="noprint" style="margin-top:24px;text-align:center;"><button onclick="window.print()" style="padding:12px 24px;background:linear-gradient(180deg,#b45309,#92400e);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;">印刷する（PDFに保存可）</button><br><span style="font-size:12px;color:#64748b;margin-top:8px;display:inline-block;">印刷先で「PDFに保存」を選択するとPDFで保存できます</span></p></body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); }
  };

  const handlePrintComments = () => {
    const hasAi = analysisResult && String(analysisResult).trim() !== '';
    const hasInstructor = instructorComment && String(instructorComment).trim() !== '';
    if (!hasAi && !hasInstructor) { alert('印刷できるコメントがありません。'); return; }
    const safeName = escapeHtml(personName || '');
    let body = '';
    if (hasAi) body += '<div style="margin-bottom:24px;"><h3 style="font-size:16px;margin:0 0 8px;color:#6d28d9;">AI分析</h3><div style="white-space:pre-wrap;line-height:1.8;font-size:14px;color:#334155;">' + escapeHtml(analysisResult) + '</div></div>';
    if (hasInstructor) body += '<div><h3 style="font-size:16px;margin:0 0 8px;color:#0369a1;">インストラクターからの一言</h3><div style="white-space:pre-wrap;line-height:1.8;font-size:14px;color:#334155;">' + escapeHtml(instructorComment) + '</div></div>';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + safeName + '様 コメント</title><style>@media print{body{margin:0;} .noprint{display:none;}}</style></head><body style="font-family:\'Hiragino Sans\',\'Yu Gothic\',sans-serif;max-width:640px;margin:0 auto;padding:32px;"><div style="text-align:center;margin-bottom:32px;"><h1 style="font-size:20px;margin:0;color:#0f172a;">' + safeName + '様</h1><p style="font-size:14px;margin:4px 0 0;color:#64748b;">' + year + '年度 お便り</p></div><div style="border-top:1px solid #e2e8f0;padding-top:24px;">' + body + '</div><p class="noprint" style="margin-top:32px;text-align:center;"><button onclick="window.print()" style="padding:12px 24px;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:bold;">印刷する（PDFに保存可）</button><br><span style="font-size:12px;color:#64748b;margin-top:8px;display:inline-block;">印刷先で「PDFに保存」を選択するとPDFで保存できます</span></p></body></html>';
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, 'fitness_results', docId);
      const payload = {
        name: personName, year,
        round1: rounds[0], round2: rounds[1], round3: rounds[2], round4: rounds[3],
        round1Date: roundDates[0] || null, round2Date: roundDates[1] || null, round3Date: roundDates[2] || null, round4Date: roundDates[3] || null,
        updatedAt: serverTimestamp()
      };
      if (analysisResult) { payload.analysisResult = analysisResult; payload.analysisResultAt = serverTimestamp(); }
      payload.instructorComment = instructorComment ?? '';
      payload.rhythmTraining = {
        q1: (rhythmTraining?.q1 ?? '').trim(), q2: (rhythmTraining?.q2 ?? '').trim(),
        q3: (rhythmTraining?.q3 ?? '').trim(), q4: (rhythmTraining?.q4 ?? '').trim()
      };
      await setDoc(ref, payload, { merge: true });
      alert('保存しました。リズムトレーニングの級は生徒の成績表に反映されます。' + (analysisResult ? '（AI分析結果も保存しました）' : ''));
    } catch (e) { alert('保存に失敗しました: ' + e.message); }
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
        <div className="flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 gap-3 flex-wrap">
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
                {GRADE_OPTIONS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {gradeFromAge && <span className="text-xs text-slate-500">（年齢から算出）</span>}
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
        </div>
        <div className="flex-shrink-0 px-4 py-4 bg-gradient-to-r from-sky-500 to-sky-600 rounded-none">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-white font-bold text-base flex items-center gap-2 shrink-0">
              <Printer size={22} /> 印刷・PDFで保存
            </span>
            <div className="flex flex-wrap gap-3">
              <button onClick={handlePrintScores} className="flex items-center gap-2 px-5 py-2.5 bg-white text-sky-700 rounded-lg font-bold text-sm hover:bg-sky-50 shadow-md">
                <FileDown size={18} /> 成績表を印刷/PDF
              </button>
              <button onClick={handlePrintComments} className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-slate-800 rounded-lg font-bold text-sm hover:bg-amber-300 shadow-md">
                <FileDown size={18} /> コメントを印刷/PDF
              </button>
            </div>
            <span className="text-sky-100 text-xs">別タブで開き、印刷ダイアログでPDFに保存できます</span>
          </div>
        </div>
        <div className="overflow-auto flex-1 p-4">
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-bold text-slate-600 mb-2">各回の測定日（年4回の体力測定を行った日付）</p>
            <div className="flex flex-wrap gap-4 items-center">
              {[0, 1, 2, 3].map(ri => (
                <div key={ri} className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">{ri + 1}回目</label>
                  <input type="date" className="border border-slate-300 rounded px-2 py-1.5 text-sm" value={roundDates[ri]} onChange={e => handleRoundDateChange(ri, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          <div className="mb-4 p-4 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              リズム(級) リズムトレーニング
              <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                <Share2 size={14} className="text-emerald-600" /> 保存すると生徒の成績表に反映されます
              </span>
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              {[0, 1, 2, 3].map(ri => (
                <div key={ri} className="flex items-center gap-1.5">
                  <input type="text" className="border border-slate-300 rounded px-3 py-2 text-sm w-20 text-center bg-white focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400" placeholder="—" value={rhythmTraining?.[`q${ri + 1}`] ?? ''} onChange={e => setRhythmTraining(prev => ({ ...prev, [`q${ri + 1}`]: e.target.value }))} />
                  <span className="text-xs text-slate-600">級</span>
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
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-center text-sm" placeholder="—" value={getRoundValue(ri, item.id, 'avg')} onChange={e => handleRoundChange(ri, item.id, 'avg', e.target.value)} />
                            {unit ? <span className="text-slate-500 text-xs shrink-0">{unit}</span> : null}
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1 bg-blue-50/50">
                          <div className="flex items-center justify-center gap-1">
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-blue-200 rounded px-2 py-1.5 text-center text-sm font-medium" placeholder="—" value={getRoundValue(ri, item.id, 'result')} onChange={e => handleRoundChange(ri, item.id, 'result', e.target.value)} />
                            {unit ? <span className="text-slate-500 text-xs shrink-0">{unit}</span> : null}
                          </div>
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                );
              })}
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
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-slate-200 rounded px-2 py-1.5 text-center text-sm" placeholder="—" value={getRoundValue(ri, item.id, 'avg')} onChange={e => handleRoundChange(ri, item.id, 'avg', e.target.value)} />
                            {unit ? <span className="text-slate-500 text-xs shrink-0">{unit}</span> : null}
                          </div>
                        </td>
                        <td className="border border-slate-200 p-1 bg-blue-50/50">
                          <div className="flex items-center justify-center gap-1">
                            <input type="text" inputMode="decimal" className="flex-1 min-w-0 border border-blue-200 rounded px-2 py-1.5 text-center text-sm font-medium" placeholder="—" value={getRoundValue(ri, item.id, 'result')} onChange={e => handleRoundChange(ri, item.id, 'result', e.target.value)} />
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
          {(analysisResult != null || analysisLoading) && (
            <div className="mt-6 p-4 rounded-xl border border-violet-200 bg-violet-50/50">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-violet-600"/> AI分析
              </h4>
              {analysisLoading ? (
                <p className="text-slate-500">分析中...</p>
              ) : (
                <>
                  <textarea className="w-full min-h-[200px] p-3 text-sm text-slate-700 leading-relaxed border border-violet-200 rounded-lg bg-white resize-y" placeholder="AI分析の結果がここに表示されます。文章を修正してから「AI分析を保存」で反映できます。" value={analysisResult ?? ''} onChange={e => setAnalysisResult(e.target.value)} />
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button type="button" onClick={handleSaveAnalysis} disabled={analysisSaving} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">
                      {analysisSaving ? '保存中...' : 'AI分析を保存'}
                    </button>
                    <span className="text-xs text-slate-500">編集した文章をFirebaseに保存します。</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">※ 上の文章は自由に編集できます。編集後に「AI分析を保存」を押すとFirebaseに反映されます。</p>
                </>
              )}
              <p className="text-xs text-slate-400 mt-2">※ 入力データはOpenAI APIに送信されます。APIキーは .env の VITE_OPENAI_API_KEY で設定してください。</p>
            </div>
          )}
          <div className="mt-6 p-4 rounded-xl border border-sky-200 bg-sky-50/50">
            <h4 className="font-bold text-slate-700 mb-2">インストラクターからの一言</h4>
            <textarea className="w-full min-h-[120px] p-3 text-sm text-slate-700 leading-relaxed border border-sky-200 rounded-lg bg-white resize-y" placeholder="保護者やお子さんへ伝えたいことを自由に書けます。保存またはAI分析を保存で反映されます。" value={instructorComment ?? ''} onChange={e => setInstructorComment(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1">※ 自由記述です。ヘッダーの「保存」または「AI分析を保存」でFirebaseに保存されます。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
