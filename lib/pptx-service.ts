export interface ReportDataForPptx {
  SERVICE_CODE: string
  ID_NUMBER: string
  NAME_AR: string
  NAME_EN: string
  DAYS_COUNT: number
  ENTRY_DATE_GREGORIAN: string
  EXIT_DATE_GREGORIAN: string
  ENTRY_DATE_HIJRI?: string
  EXIT_DATE_HIJRI?: string
  REPORT_ISSUE_DATE: string
  NATIONALITY_AR: string
  NATIONALITY_EN: string
  DOCTOR_NAME_AR: string
  DOCTOR_NAME_EN: string
  JOB_TITLE_AR: string
  JOB_TITLE_EN: string
  HOSPITAL_NAME_AR: string
  HOSPITAL_NAME_EN: string
  PRINT_DATE: string
  PRINT_TIME: string
}

export async function downloadPptxViaApi(data: ReportDataForPptx) {
  const baseUrl = process.env.NEXT_PUBLIC_PPTX_API_URL
  if (!baseUrl) throw new Error("PPTX API URL is not configured")

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/generate-pptx`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || "Failed to generate PPTX")
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `sickLeaves_${data.NAME_AR}_${data.ID_NUMBER}.pptx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function downloadPdfViaApi(data: ReportDataForPptx) {
  const baseUrl = process.env.NEXT_PUBLIC_PPTX_API_URL
  if (!baseUrl) throw new Error("PPTX API URL is not configured")

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || "Failed to generate PDF")
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `sickLeaves_${data.NAME_AR}_${data.ID_NUMBER}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}


