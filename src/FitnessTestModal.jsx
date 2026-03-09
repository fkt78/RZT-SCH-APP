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

  const [showExtra, setShowExtra] = useState(true);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-slate-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">

        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
          <Award size={16} className="text-amber-500 shrink-0"/>
          <span className="font-bold text-slate-800 text-sm shrink-0">{personName} 体力測定成績</span>
          <div className="flex items-center gap-1 ml-1">
            <label className="text-xs text-slate-500">年度:</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-slate-300 rounded px-1.5 py-0.5 text-xs">
              {[currentYear, currentYear - 1, currentYear - 2].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">学年:</label>
            <select value={grade} onChange={e => setGrade(e.target.value)} className="border border-slate-300 rounded px-1.5 py-0.5 text-xs">
              <option value="">選択</option>
              {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {gradeFromAge && <span className="text-xs text-slate-400">（自動）</span>}
          </div>
          <button onClick={handleApplyAveragesFromDb} type="button" className="flex items-center gap-1 text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700">
            <Database size={11} /> 同年代平均読込
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 font-bold">
            {saving ? '保存中…' : '保存'}
          </button>
          <button onClick={handleAiAnalysis} disabled={analysisLoading} className="flex items-center gap-1 text-xs bg-violet-600 text-white px-2 py-1 rounded hover:bg-violet-700 disabled:opacity-50">
            <Sparkles size={11} /> {analysisLoading ? '分析中…' : 'AI分析'}
          </button>
          <button onClick={handlePrintScores} className="flex items-center gap-1 text-xs bg-sky-600 text-white px-2 py-1 rounded hover:bg-sky-700">
            <FileDown size={11} /> 成績PDF
          </button>
          <button onClick={handlePrintComments} className="flex items-center gap-1 text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600">
            <FileDown size={11} /> コメントPDF
          </button>
          <button onClick={() => setShowExtra(v => !v)} className="flex items-center gap-1 text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-300">
            <Sparkles size={11} /> {showExtra ? 'AI/コメント▲' : 'AI/コメント▼'}
          </button>
          <button onClick={onClose} className="ml-auto p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700">
            <XCircle size={18} />
          </button>
        </div>

        <div className="flex items-center gap-x-4 gap-y-1 px-3 py-1 bg-white border-b border-slate-100 flex-wrap text-xs">
          <span className="text-slate-500 font-medium shrink-0">測定日:</span>
          {[0, 1, 2, 3].map(ri => (
            <div key={ri} className="flex items-center gap-1">
              <span className="text-slate-600 font-medium">{ri + 1}回目</span>
              <input type="date" className="border border-slate-300 rounded px-1.5 py-0.5 text-xs" value={roundDates[ri]} onChange={e => handleRoundDateChange(ri, e.target.value)} />
            </div>
          ))}
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
            <Share2 size={11} className="text-emerald-600"/>リズム(級):
          </span>
          {[0, 1, 2, 3].map(ri => (
            <div key={ri} className="flex items-center gap-0.5">
              <span className="text-slate-500">{ri + 1}回目</span>
              <input type="text" className="border border-slate-300 rounded px-1.5 py-0.5 text-xs w-12 text-center bg-emerald-50" placeholder="—" value={rhythmTraining?.[`q${ri + 1}`] ?? ''} onChange={e => setRhythmTraining(prev => ({ ...prev, [`q${ri + 1}`]: e.target.value }))} />
              <span className="text-slate-500">級</span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1">
          <table className="w-full text-xs border-collapse table-fixed">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '20.5%' }} />
              <col style={{ width: '20.5%' }} />
              <col style={{ width: '20.5%' }} />
              <col style={{ width: '20.5%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="border border-slate-300 px-2 py-1 bg-slate-100 font-bold text-slate-700 text-left">種目</th>
                {[0, 1, 2, 3].map(ri => (
                  <th key={ri} className="border border-slate-300 px-1 py-1 bg-slate-100 font-bold text-slate-700 text-center">
                    {ri + 1}回目
                    {roundDates[ri] ? <span className="font-normal text-slate-500 text-xs ml-1">({roundDates[ri].slice(5)})</span> : ''}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="border border-slate-200 bg-slate-50"></th>
                {[0, 1, 2, 3].map(ri => (
                  <th key={ri} className="border border-slate-200 px-1 py-0.5 bg-slate-50">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-normal">平均</span>
                      <span className="text-blue-700 font-bold">今回</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...fixedRows, ...testItems].map((item) => {
                const unit = getUnitForItem(item);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="border border-slate-200 px-2 py-1 bg-slate-50 align-middle">
                      <span className="font-bold text-slate-800 leading-tight block">{item.category}</span>
                      {item.name ? <span className="text-slate-400 block leading-tight" style={{ fontSize: '10px' }}>{item.name}</span> : null}
                      {unit ? <span className="text-slate-400 leading-tight" style={{ fontSize: '10px' }}>（{unit}）</span> : null}
                    </td>
                    {[0, 1, 2, 3].map(ri => (
                      <td key={ri} className="border border-slate-200 px-1 py-1">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 shrink-0" style={{ fontSize: '10px', width: '22px' }}>平均</span>
                            <input
                              type="text" inputMode="decimal"
                              className="flex-1 min-w-0 border border-slate-200 rounded px-1 py-0 text-center h-5 bg-white"
                              style={{ fontSize: '11px' }}
                              placeholder="—"
                              value={getRoundValue(ri, item.id, 'avg')}
                              onChange={e => handleRoundChange(ri, item.id, 'avg', e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600 font-bold shrink-0" style={{ fontSize: '10px', width: '22px' }}>今回</span>
                            <input
                              type="text" inputMode="decimal"
                              className="flex-1 min-w-0 border border-blue-300 rounded px-1 py-0 text-center h-5 font-bold bg-blue-50"
                              style={{ fontSize: '11px' }}
                              placeholder="—"
                              value={getRoundValue(ri, item.id, 'result')}
                              onChange={e => handleRoundChange(ri, item.id, 'result', e.target.value)}
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {showExtra && (
            <div className="mt-3 space-y-3">
              {(analysisResult != null || analysisLoading) && (
                <div className="p-3 rounded-xl border border-violet-200 bg-violet-50/50">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2 text-sm">
                    <Sparkles size={15} className="text-violet-600"/> AI分析
                  </h4>
                  {analysisLoading ? (
                    <p className="text-slate-500 text-sm">分析中...</p>
                  ) : (
                    <>
                      <textarea className="w-full min-h-[160px] p-2 text-sm text-slate-700 leading-relaxed border border-violet-200 rounded-lg bg-white resize-y" placeholder="AI分析の結果がここに表示されます。" value={analysisResult ?? ''} onChange={e => setAnalysisResult(e.target.value)} />
                      <div className="mt-2 flex items-center gap-2">
                        <button type="button" onClick={handleSaveAnalysis} disabled={analysisSaving} className="px-3 py-1 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50">
                          {analysisSaving ? '保存中...' : 'AI分析を保存'}
                        </button>
                        <span className="text-xs text-slate-500">編集後に保存でFirebaseに反映</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/50">
                <h4 className="font-bold text-slate-700 mb-2 text-sm">インストラクターからの一言</h4>
                <textarea className="w-full min-h-[100px] p-2 text-sm text-slate-700 leading-relaxed border border-sky-200 rounded-lg bg-white resize-y" placeholder="保護者やお子さんへ伝えたいことを自由に書けます。" value={instructorComment ?? ''} onChange={e => setInstructorComment(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">※ ヘッダーの「保存」でFirebaseに保存されます。</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
