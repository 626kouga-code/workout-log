import { tz } from "@date-fns/tz";
import { format, isValid, parse, startOfWeek } from "date-fns";

/**
 * 日付の扱い（docs/03 非機能要件「時刻・単位」）。
 * - 日時は UTC で保存し、画面では日本時間で表示する
 * - 「実施日」「測定日」は日本時間の日付（"YYYY-MM-DD"）で扱う
 * - 週は月曜始まり（週間サマリー F-34）
 */
export const TIME_ZONE = "Asia/Tokyo";

const inJst = tz(TIME_ZONE);
const DATE_FORMAT = "yyyy-MM-dd";

/** 日時を、日本時間の日付 "YYYY-MM-DD" にする */
export function toJstDate(instant: Date): string {
  return format(instant, DATE_FORMAT, { in: inJst });
}

/** 日本時間の今日の日付 "YYYY-MM-DD" */
export function jstToday(now: Date = new Date()): string {
  return toJstDate(now);
}

/** "YYYY-MM-DD" の形で、実在する日付か（2026-02-30 などは false） */
export function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parse(value, DATE_FORMAT, new Date(0), { in: inJst });
  return (
    isValid(parsed) && format(parsed, DATE_FORMAT, { in: inJst }) === value
  );
}

/** その日を含む週の月曜日 "YYYY-MM-DD" */
export function jstWeekStart(date: string): string {
  if (!isDateString(date)) {
    throw new RangeError(`日付の形式が正しくありません: ${date}`);
  }
  const parsed = parse(date, DATE_FORMAT, new Date(0), { in: inJst });
  return format(
    startOfWeek(parsed, { weekStartsOn: 1, in: inJst }),
    DATE_FORMAT,
    {
      in: inJst,
    },
  );
}
