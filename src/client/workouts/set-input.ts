import {
  DISTANCE_MAX_M,
  DURATION_MAX_SECONDS,
  REPS_MAX,
  WEIGHT_MAX_KG,
} from "@/lib/validation/workout-sync";

/**
 * セットの入力欄の文字と、保存する値の変換。
 * 入力の途中で弾くと打ちにくいので、入力欄を離れたときに範囲・刻みへ丸めて保存する。
 * 空欄・数字でないものは null（未入力）にする。
 */

function toNumber(text: string): number | null {
  // 全角数字・全角ピリオドも受け付ける
  const normalized = text
    .trim()
    .replace(/[０-９．]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    );
  if (normalized === "") return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** 重量を 0〜999.75kg、0.25kg 刻みに収める */
export function clampWeight(kg: number): number {
  return clamp(Math.round(kg * 4) / 4, 0, WEIGHT_MAX_KG);
}

export function parseWeight(text: string): number | null {
  const value = toNumber(text);
  return value === null ? null : clampWeight(value);
}

export function parseReps(text: string): number | null {
  const value = toNumber(text);
  if (value === null) return null;
  const reps = Math.round(value);
  return reps < 1 ? null : Math.min(reps, REPS_MAX);
}

/** 秒数（時間の種目） */
export function parseSeconds(text: string): number | null {
  const value = toNumber(text);
  if (value === null) return null;
  const seconds = Math.round(value);
  return seconds < 1 ? null : Math.min(seconds, DURATION_MAX_SECONDS);
}

/** 分を秒数にする（有酸素の種目） */
export function parseMinutes(text: string): number | null {
  const value = toNumber(text);
  return value === null ? null : parseSeconds(String(value * 60));
}

/** km をメートルにする（有酸素の種目） */
export function parseKilometers(text: string): number | null {
  const value = toNumber(text);
  if (value === null) return null;
  return clamp(Math.round(value * 1000), 0, DISTANCE_MAX_M);
}

/** 入力欄に出す文字（null は空欄） */
export function formatNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

/** 秒数を分にして表示する（小数第 2 位まで） */
export function formatMinutes(seconds: number | null): string {
  return seconds === null ? "" : String(Math.round((seconds / 60) * 100) / 100);
}

/** メートルを km にして表示する */
export function formatKilometers(meters: number | null): string {
  return meters === null ? "" : String(meters / 1000);
}
