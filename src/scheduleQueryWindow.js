import { collection, query, where, orderBy } from 'firebase/firestore';

/**
 * schedules コレクションの日時フィールドは `start`（Firestore Timestamp）。
 * ※ユーザー指示の startDate ではなく、既存データが保存している `start` でフィルターします。
 * 取得範囲: 基準日から過去3ヶ月〜未来3ヶ月（通信量・読み取り削減用）。
 */
export function getScheduleQueryBounds() {
  const now = new Date();
  const startMin = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate(), 0, 0, 0, 0);
  const startMax = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), 23, 59, 59, 999);
  return { startMin, startMax };
}

/** `where('start', '>=', …)` + `where('start', '<=', …)` + `orderBy('start')` */
export function schedulesInWindowQuery(db, orderDirection = 'asc') {
  const { startMin, startMax } = getScheduleQueryBounds();
  return query(
    collection(db, 'schedules'),
    where('start', '>=', startMin),
    where('start', '<=', startMax),
    orderBy('start', orderDirection)
  );
}
