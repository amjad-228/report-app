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
 * عند تغيير حقل عربي: بعد التأخير يُترجم النص ويُحدَّث الحقل الإنجليزي المقابل.
 * إذا أُفرغ الحقل العربي يُفرغ الإنجليزي. إذا لم يُدخل أي حرف عربي لا تُستدعى الترجمة.
 */
export function scheduleArToEnSync<T extends object>(
  setFormData: Dispatch<SetStateAction<T>>,
  timersRef: MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>,
  arKey: keyof T & string,
  enKey: keyof T & string,
  arValue: string,
  debounceMs = 550,
): void {
  const id = arKey
  const prev = timersRef.current[id]
  if (prev) clearTimeout(prev)

  timersRef.current[id] = setTimeout(async () => {
    const trimmed = arValue.trim()
    if (!trimmed) {
      setFormData((p) => ({ ...p, [enKey]: "" } as T))
      return
    }
    if (!ARABIC_SCRIPT_RE.test(arValue)) {
      return
    }
    try {
      const en = await fetchTranslateArToEn(arValue)
      setFormData((p) => ({ ...p, [enKey]: en } as T))
    } catch (e) {
      console.error("Auto-translate failed:", e)
    }
  }, debounceMs)
}

export function clearArToEnTimers(timersRef: MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>): void {
  Object.values(timersRef.current).forEach(clearTimeout)
  timersRef.current = {}
}
