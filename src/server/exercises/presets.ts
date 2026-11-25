import type { BodyPart, ExerciseKind } from "@/lib/exercise";

/**
 * プリセット種目（F-10、docs/02_functional-requirements.md の付録）。
 *
 * ID は固定にしている。端末（IndexedDB）に保存した種目の ID が、
 * シードを流し直しても変わらないようにするため（F-16 の圏外での記録）。
 * ID は作成順に並ぶ UUIDv7 で、この配列の順（＝付録の順）に並ぶ。
 * 種目を足すときは、末尾に新しい ID で追加する（既存の ID は変えない）。
 * 付録と見比べやすいよう、整形（Prettier）をかけずに 1 種目 1 行で並べている。
 */
// prettier-ignore
export const PRESET_EXERCISES: readonly {
  id: string;
  name: string;
  bodyPart: BodyPart;
  kind: ExerciseKind;
}[] = [
  { id: "01a21000-8800-7000-8000-000000000000", name: "ベンチプレス", bodyPart: "CHEST", kind: "WEIGHT" },
  { id: "01a21000-8801-7010-8404-050101010101", name: "インクラインベンチプレス", bodyPart: "CHEST", kind: "WEIGHT" },
  { id: "01a21000-8802-7020-8808-0a0202020202", name: "ダンベルプレス", bodyPart: "CHEST", kind: "WEIGHT" },
  { id: "01a21000-8803-7030-8c0c-0f0303030303", name: "ダンベルフライ", bodyPart: "CHEST", kind: "WEIGHT" },
  { id: "01a21000-8804-7040-9010-100404040404", name: "腕立て伏せ", bodyPart: "CHEST", kind: "BODYWEIGHT" },
  { id: "01a21000-8805-7050-9414-150505050505", name: "ディップス", bodyPart: "CHEST", kind: "BODYWEIGHT" },
  { id: "01a21000-8806-7060-9818-1a0606060606", name: "デッドリフト", bodyPart: "BACK", kind: "WEIGHT" },
  { id: "01a21000-8807-7070-9c1c-1f0707070707", name: "ラットプルダウン", bodyPart: "BACK", kind: "WEIGHT" },
  { id: "01a21000-8808-7080-a020-200808080808", name: "ベントオーバーロウ", bodyPart: "BACK", kind: "WEIGHT" },
  { id: "01a21000-8809-7090-a424-250909090909", name: "シーテッドロウ", bodyPart: "BACK", kind: "WEIGHT" },
  { id: "01a21000-880a-70a0-a828-2a0a0a0a0a0a", name: "ワンハンドダンベルロウ", bodyPart: "BACK", kind: "WEIGHT" },
  { id: "01a21000-880b-70b0-ac2c-2f0b0b0b0b0b", name: "懸垂", bodyPart: "BACK", kind: "BODYWEIGHT" },
  { id: "01a21000-880c-70c0-b030-300c0c0c0c0c", name: "スクワット", bodyPart: "LEGS", kind: "WEIGHT" },
  { id: "01a21000-880d-70d0-b434-350d0d0d0d0d", name: "レッグプレス", bodyPart: "LEGS", kind: "WEIGHT" },
  { id: "01a21000-880e-70e0-b838-3a0e0e0e0e0e", name: "ブルガリアンスクワット", bodyPart: "LEGS", kind: "WEIGHT" },
  { id: "01a21000-880f-70f0-bc3c-3f0f0f0f0f0f", name: "ルーマニアンデッドリフト", bodyPart: "LEGS", kind: "WEIGHT" },
  { id: "01a21000-8810-7101-8040-401010101010", name: "レッグエクステンション", bodyPart: "LEGS", kind: "WEIGHT" },
  { id: "01a21000-8811-7111-8444-451111111111", name: "レッグカール", bodyPart: "LEGS", kind: "WEIGHT" },
  { id: "01a21000-8812-7121-8848-4a1212121212", name: "カーフレイズ", bodyPart: "LEGS", kind: "WEIGHT" },
  { id: "01a21000-8813-7131-8c4c-4f1313131313", name: "ショルダープレス", bodyPart: "SHOULDERS", kind: "WEIGHT" },
  { id: "01a21000-8814-7141-9050-501414141414", name: "サイドレイズ", bodyPart: "SHOULDERS", kind: "WEIGHT" },
  { id: "01a21000-8815-7151-9454-551515151515", name: "リアレイズ", bodyPart: "SHOULDERS", kind: "WEIGHT" },
  { id: "01a21000-8816-7161-9858-5a1616161616", name: "バーベルカール", bodyPart: "ARMS", kind: "WEIGHT" },
  { id: "01a21000-8817-7171-9c5c-5f1717171717", name: "ダンベルカール", bodyPart: "ARMS", kind: "WEIGHT" },
  { id: "01a21000-8818-7181-a060-601818181818", name: "トライセプスプッシュダウン", bodyPart: "ARMS", kind: "WEIGHT" },
  { id: "01a21000-8819-7191-a464-651919191919", name: "フレンチプレス", bodyPart: "ARMS", kind: "WEIGHT" },
  { id: "01a21000-881a-71a1-a868-6a1a1a1a1a1a", name: "クランチ", bodyPart: "ABS", kind: "BODYWEIGHT" },
  { id: "01a21000-881b-71b1-ac6c-6f1b1b1b1b1b", name: "レッグレイズ", bodyPart: "ABS", kind: "BODYWEIGHT" },
  { id: "01a21000-881c-71c1-b070-701c1c1c1c1c", name: "アブローラー", bodyPart: "ABS", kind: "BODYWEIGHT" },
  { id: "01a21000-881d-71d1-b474-751d1d1d1d1d", name: "プランク", bodyPart: "ABS", kind: "TIMED" },
  { id: "01a21000-881e-71e1-b878-7a1e1e1e1e1e", name: "サイドプランク", bodyPart: "ABS", kind: "TIMED" },
  { id: "01a21000-881f-71f1-bc7c-7f1f1f1f1f1f", name: "ケトルベルスイング", bodyPart: "FULL_BODY", kind: "WEIGHT" },
  { id: "01a21000-8820-7202-8080-802020202020", name: "ランニング", bodyPart: "CARDIO", kind: "CARDIO" },
  { id: "01a21000-8821-7212-8484-852121212121", name: "ウォーキング", bodyPart: "CARDIO", kind: "CARDIO" },
  { id: "01a21000-8822-7222-8888-8a2222222222", name: "エアロバイク", bodyPart: "CARDIO", kind: "CARDIO" },
  { id: "01a21000-8823-7232-8c8c-8f2323232323", name: "縄跳び", bodyPart: "CARDIO", kind: "CARDIO" },
];
