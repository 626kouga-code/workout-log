/** 重量を「80kg」「82.5kg」の形の文字列にする */
export function formatWeightKg(kg: number): string {
  return `${Number(kg.toFixed(2))}kg`;
}
