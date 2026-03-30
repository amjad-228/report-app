import type { ReportDataForPptx } from "./pptx-service"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function row(label: string, value: string | number | undefined): string {
  const v = value === undefined || value === null ? "—" : String(value)
  return `<tr><th style="text-align:right;padding:6px 10px;border:1px solid #cbd5e1;background:#f8fafc;font-weight:600;color:#3730a3">${escapeHtml(label)}</th><td style="text-align:right;padding:6px 10px;border:1px solid #cbd5e1">${escapeHtml(v)}</td></tr>`
}

/** إنشاء PDF من المتصفح (دعم العربية عبر الرسم كنص في الصفحة). يُستخدم احتياطياً إذا فشل خادم /generate-pdf. */
export async function downloadReportPdfFromBrowser(data: ReportDataForPptx): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")])

  const rows = [
    row("رمز الخدمة", data.SERVICE_CODE),
    row("رقم الهوية", data.ID_NUMBER),
    row("الاسم (عربي)", data.NAME_AR),
    row("الاسم (إنجليزي)", data.NAME_EN),
    row("عدد الأيام", data.DAYS_COUNT),
    row("تاريخ الدخول (ميلادي)", data.ENTRY_DATE_GREGORIAN),
    row("تاريخ الخروج (ميلادي)", data.EXIT_DATE_GREGORIAN),
    row("تاريخ الدخول (هجري)", data.ENTRY_DATE_HIJRI),
    row("تاريخ الخروج (هجري)", data.EXIT_DATE_HIJRI),
    row("تاريخ إصدار التقرير", data.REPORT_ISSUE_DATE),
    row("الجنسية (عربي)", data.NATIONALITY_AR),
    row("الجنسية (إنجليزي)", data.NATIONALITY_EN),
    row("اسم الطبيب (عربي)", data.DOCTOR_NAME_AR),
    row("اسم الطبيب (إنجليزي)", data.DOCTOR_NAME_EN),
    row("المسمى الوظيفي (عربي)", data.JOB_TITLE_AR),
    row("المسمى الوظيفي (إنجليزي)", data.JOB_TITLE_EN),
    row("اسم المستشفى (عربي)", data.HOSPITAL_NAME_AR),
    row("اسم المستشفى (إنجليزي)", data.HOSPITAL_NAME_EN),
    row("تاريخ الطباعة", data.PRINT_DATE),
    row("وقت الطباعة", data.PRINT_TIME),
  ].join("")

  const div = document.createElement("div")
  div.dir = "rtl"
  div.setAttribute("lang", "ar")
  div.style.cssText =
    "position:fixed;left:-12000px;top:0;width:720px;padding:28px;background:#ffffff;color:#0f172a;font-family:'Segoe UI',Tahoma,'Arial Unicode MS',sans-serif;font-size:13px;line-height:1.45;"

  div.innerHTML = `
    <div style="border-bottom:3px solid #4f46e5;padding-bottom:12px;margin-bottom:18px">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#312e81">تقرير طبي</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#64748b">Medical report summary (generated locally)</p>
    </div>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
  `

  document.body.appendChild(div)
  await new Promise<void>((r) => requestAnimationFrame(() => r()))
  try {
    await document.fonts.ready
  } catch {
    /* ignore */
  }

  const canvas = await html2canvas(div, {
    scale: 2,
    logging: false,
    useCORS: true,
    backgroundColor: "#ffffff",
  })
  document.body.removeChild(div)

  const imgData = canvas.toDataURL("image/jpeg", 0.92)
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 10
  const usableW = pageW - 2 * margin
  const usableH = pageH - 2 * margin
  const imgW = usableW
  const imgH = (canvas.height * imgW) / canvas.width

  if (imgH <= usableH) {
    pdf.addImage(imgData, "JPEG", margin, margin, imgW, imgH)
  } else {
    const scale = usableH / imgH
    pdf.addImage(imgData, "JPEG", margin, margin, imgW * scale, usableH)
  }

  const safeName = `sickLeaves_${data.ID_NUMBER}.pdf`
  pdf.save(safeName)
}
