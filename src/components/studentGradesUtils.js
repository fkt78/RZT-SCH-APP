/** タイム系種目か（数値が小さいほど良い＝走るタイムなど）。バランス・片足閉眼は「立っていられた秒数」なので数値が大きいほど良い＝タイム系にしない */
export function isTimeItem(item) {
  const n = (item.name || '') + (item.category || '');
  if (/バランス|片足閉眼/.test(n)) return false;
  return /ラン|タイム|mラン/.test(n);
}

/** 種目ごとの表示用単位（同年代平均・今回結果に表示）。Firebase test_items の unit を優先、なければ種目から推定 */
export function getUnitForItem(item) {
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
}
