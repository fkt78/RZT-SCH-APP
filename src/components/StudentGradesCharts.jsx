import React from 'react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { Activity, TrendingUp, BarChart2 } from 'lucide-react';
import { isTimeItem } from './studentGradesUtils';

export function StudentGradesCharts({ rounds, roundDates, allRows, getRoundValue }) {
  const parseNum = (v) => {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  // 各種目ごとの折れ線用データ（1〜4回目の今回結果）
  const lineDataByItem = allRows.map((item) => {
    const label = item.name ? `${item.category}（${item.name}）` : item.category;
    const points = [0, 1, 2, 3].map((ri) => {
      const v = parseNum(getRoundValue(ri, item.id, 'result'));
      return { round: `${ri + 1}回目`, 値: v, label };
    }).filter((d) => d.値 != null);
    return { item, label, points };
  }).filter((d) => d.points.length >= 2);

  // レーダー用：最新回（4回目優先）の「同年代平均との比」スコア（100=平均）
  const radarData = allRows.map((item) => {
    const shortLabel = item.name || item.category || item.id;
    let score = null;
    for (let ri = 3; ri >= 0; ri--) {
      const avg = parseNum(getRoundValue(ri, item.id, 'avg'));
      const res = parseNum(getRoundValue(ri, item.id, 'result'));
      if (res != null && avg != null && avg !== 0) {
        score = isTimeItem(item) ? (avg / res) * 100 : (res / avg) * 100;
        break;
      }
    }
    if (score == null) score = 100;
    return { subject: shortLabel.length > 6 ? shortLabel.slice(0, 6) : shortLabel, value: Math.round(score), fullMark: 100 };
  }).filter((d) => d.value > 0 && d.value < 500);

  // 各種目ごとの伸び（1回目→4回目）
  const growthBarData = allRows.map((item) => {
    const label = item.name ? `${item.category}（${item.name}）` : item.category;
    const v1 = parseNum(getRoundValue(0, item.id, 'result'));
    const v4 = parseNum(getRoundValue(3, item.id, 'result'));
    if (v1 == null || v4 == null) return null;
    const delta = isTimeItem(item) ? v1 - v4 : v4 - v1;
    const fill = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#94a3b8';
    return { name: label.length > 10 ? label.slice(0, 10) + '…' : label, 伸び: delta, fill };
  }).filter(Boolean);

  // 強み・弱みリスト（レーダー100以上=強み、100未満=弱み）
  const strengths = radarData.filter((d) => d.value > 100);
  const weaknesses = radarData.filter((d) => d.value < 100);

  return (
    <div className="space-y-8">
      {/* 1. 強み・弱み（スパイダーグラフ） */}
      {radarData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600"/> 強み・弱み（スパイダーグラフ）
          </h4>
          <p className="text-xs text-slate-500 mb-3">100＝同年代平均。100より上＝<span className="text-green-600 font-medium">強み</span>（得意）、100より下＝<span className="text-amber-600 font-medium">弱み</span>（苦手）。</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 150]} tick={{ fontSize: 10 }} />
              <Radar name="スコア" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              <Tooltip formatter={(v) => [`${v}（100=平均）${v > 100 ? ' 強み' : v < 100 ? ' 弱み' : ''}`, 'スコア']} />
            </RadarChart>
          </ResponsiveContainer>
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {strengths.length > 0 && (
                <span className="text-green-700"><strong>強み:</strong> {strengths.map((d) => d.subject).join('・')}</span>
              )}
              {weaknesses.length > 0 && (
                <span className="text-amber-700"><strong>弱み:</strong> {weaknesses.map((d) => d.subject).join('・')}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. 成績の変化（折れ線グラフ） */}
      {lineDataByItem.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Activity size={18} className="text-violet-600"/> 成績の変化（折れ線グラフ）
          </h4>
          <p className="text-xs text-slate-500 mb-3">1回目〜4回目の測定結果の推移。種目ごとに表示しています。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lineDataByItem.map(({ item, label, points }) => (
              <div key={item.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-700 mb-2 truncate" title={label}>{label}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="round" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={32} />
                    <Tooltip formatter={(v) => [v, '今回結果']} />
                    <Line type="monotone" dataKey="値" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 各種目ごとの伸び（1回目→4回目） */}
      {growthBarData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <BarChart2 size={18} className="text-emerald-600"/> 各種目ごとの伸び（1回目→4回目）
          </h4>
          <p className="text-xs text-slate-500 mb-2">緑=向上・赤=低下。タイム系は短縮を正の伸びで表示しています。</p>
          <ResponsiveContainer width="100%" height={Math.max(220, growthBarData.length * 36)}>
            <BarChart data={growthBarData} layout="vertical" margin={{ left: 120, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, '伸び']} labelFormatter={(l) => `種目: ${l}`} />
              <Bar dataKey="伸び" radius={[0, 4, 4, 0]}>
                {growthBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {lineDataByItem.length === 0 && growthBarData.length === 0 && radarData.length === 0 && (
        <p className="text-slate-500 py-6 text-center">グラフ用の数値データが不足しています。2回分以上の測定結果がある種目から表示されます。</p>
      )}
    </div>
  );
}
