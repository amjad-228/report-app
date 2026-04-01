import type { Dispatch, MutableRefObject, SetStateAction } from "react"

/** نطاقات أحرف عربية شائعة (بما فيها العربية الموسعة والعرضية) */
export const ARABIC_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

export async function fetchTranslateArToEn(text: string): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  const data = (await res.json()) as { translatedText?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? "translate failed")
  }
  return data.translatedText ?? ""
}

/**
 * عند تغيير حقل عربي: تُستدعى الترجمة مباشرة (بدون انتظار الكتابة).
 * يُستخدم seqRef لكل حقل كي يُطبَّق فقط آخر رد يطابق آخر إدخال (تجنّب خلط النتائج عند الكتابة السريعة).
 */
export function scheduleArToEnSync<T extends object>(
  setFormData: Dispatch<SetStateAction<T>>,
  seqRef: MutableRefObject<Record<string, number>>,
  arKey: keyof T & string,
  enKey: keyof T & string,
  arValue: string,
): void {
  const trimmed = arValue.trim()
  if (!trimmed) {
    seqRef.current[arKey] = (seqRef.current[arKey] ?? 0) + 1
    setFormData((p) => ({ ...p, [enKey]: "" } as T))
    return
  }
  if (!ARABIC_SCRIPT_RE.test(arValue)) {
    return
  }

  seqRef.current[arKey] = (seqRef.current[arKey] ?? 0) + 1
  const mySeq = seqRef.current[arKey]

  void fetchTranslateArToEn(arValue).then((en) => {
    if (seqRef.current[arKey] !== mySeq) return
    setFormData((p) => ({ ...p, [enKey]: en } as T))
  }).catch((e) => {
    console.error("Auto-translate failed:", e)
  })
}

/** عند إلغاء تركيب المكوّن: إبطال الطلبات الجارية حتى لا تُحدَّث الحالة بعد الخروج. */
export function invalidateArToEnSeq(seqRef: MutableRefObject<Record<string, number>>): void {
  for (const k of Object.keys(seqRef.current)) {
    seqRef.current[k] = (seqRef.current[k] ?? 0) + 1
  }
}
