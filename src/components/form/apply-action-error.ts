import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ActionError } from "@/lib/action-result";

/**
 * Server Action から返ったエラーを React Hook Form のエラーにする。
 * フォームにある項目のエラーはその項目の下に、それ以外はフォーム全体のエラー（root）に出す。
 */
export function applyActionError<T extends FieldValues>(
  error: ActionError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  let shown = false;
  for (const [key, messages] of Object.entries(error.fieldErrors ?? {})) {
    const field = fields.find((f) => f === key);
    if (field && messages[0]) {
      setError(field, { type: "server", message: messages[0] });
      shown = true;
    }
  }
  if (!shown) {
    setError("root", { type: "server", message: error.message });
  }
}
