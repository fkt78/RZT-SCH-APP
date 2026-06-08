const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** 「6月14日(日)」形式の日付＋曜日。日曜は日付・曜日とも赤色 */
export default function JapaneseDateWithWeekday({
  date,
  sundayClassName,
  weekdaySundayClassName = 'text-red-600',
}) {
  const d = date instanceof Date ? date : new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAYS[d.getDay()];
  const isSunday = d.getDay() === 0;
  const redClass = sundayClassName ?? weekdaySundayClassName;

  if (isSunday) {
    return (
      <span className={redClass}>
        {month}月{day}日({weekday})
      </span>
    );
  }

  return (
    <>
      {month}月{day}日({weekday})
    </>
  );
}
