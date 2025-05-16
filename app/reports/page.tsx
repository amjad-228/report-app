"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import { BarChart3, PlusCircle, Edit, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react"

interface Report {
  id: string
  service_code: string
  id_number: string
  name_ar: string
  name_en: string
  days_count: number
  entry_date_gregorian: string
  exit_date_gregorian: string
  created_at: string
  [key: string]: any
}

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 5
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      router.push("/")
      return
    }

    // جلب التقارير
    fetchReports(userId, page)
  }, [router, page])

  const fetchReports = async (userId: string, page: number) => {
    setLoading(true)
    setError(null)

    try {
      // حساب الإزاحة
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // جلب إجمالي عدد التقارير
      const { count, error: countError } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_deleted", false)

      if (countError) {
        throw new Error("حدث خطأ أثناء جلب عدد التقارير")
      }

      // حساب إجمالي الصفحات
      setTotalPages(Math.ceil((count || 0) / pageSize))

      // جلب التقارير للصفحة الحالية
      const { data, error: fetchError } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(from, to)

      if (fetchError) {
        throw new Error("حدث خطأ أثناء جلب التقارير")
      }

      setReports(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSimilar = (report: Report) => {
    // تخزين بيانات التقرير في التخزين المحلي للاستخدام في صفحة الإضافة
    localStorage.setItem("report_template", JSON.stringify(report))
    router.push("/add")
  }

  const handleEdit = (report: Report) => {
    // تخزين بيانات التقرير في التخزين المحلي للاستخدام في صفحة التعديل
    localStorage.setItem("report_to_edit", JSON.stringify(report))
    router.push("/edit")
  }

  const handleDelete = (report: Report) => {
    // تخزين بيانات التقرير في التخزين المحلي للاستخدام في صفحة الحذف
    localStorage.setItem("report_to_delete", JSON.stringify(report))
    router.push("/delete")
  }

  const handleDownloadPPTX = (report: Report) => {
    // في التطبيق الحقيقي، سنقوم بتنزيل ملف PPTX
    alert(`سيتم تنزيل ملف PPTX للتقرير: ${report.name_ar}`)
  }

  const handleDownloadPDF = (report: Report) => {
    // في التطبيق الحقيقي، سنقوم بتنزيل ملف PDF
    alert(`سيتم تنزيل ملف PDF للتقرير: ${report.name_ar}`)
  }

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-SA")
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <BackButton />
      <PageHeader
        title="التقارير"
        description="جميع التقارير التي تم إنشاؤها"
        icon={<BarChart3 className="h-8 w-8" />}
      />

      {error && <AlertMessage type="error" title="خطأ" message={error} />}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">جاري تحميل التقارير...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد تقارير</p>
          <Button onClick={() => router.push("/add")} className="mt-4 bg-blue-500 hover:bg-blue-600">
            إنشاء تقرير جديد
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{report.name_ar}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">رمز الخدمة:</span>
                      <p>{report.service_code}</p>
                    </div>
                    <div>
                      <span className="font-medium">رقم الهوية:</span>
                      <p>{report.id_number}</p>
                    </div>
                    <div>
                      <span className="font-medium">تاريخ الدخول:</span>
                      <p>{formatDate(report.entry_date_gregorian)}</p>
                    </div>
                    <div>
                      <span className="font-medium">تاريخ الخروج:</span>
                      <p>{formatDate(report.exit_date_gregorian)}</p>
                    </div>
                    <div>
                      <span className="font-medium">عدد الأيام:</span>
                      <p>{report.days_count}</p>
                    </div>
                    <div>
                      <span className="font-medium">تاريخ الإنشاء:</span>
                      <p>{new Date(report.created_at).toLocaleDateString("ar-SA")}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Button
                      onClick={() => handleAddSimilar(report)}
                      className="bg-blue-500 hover:bg-blue-600"
                      size="sm"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      إضافة مشابه
                    </Button>
                    <Button onClick={() => handleEdit(report)} className="bg-yellow-500 hover:bg-yellow-600" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      تعديل
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <Button onClick={() => handleDelete(report)} className="bg-red-500 hover:bg-red-600" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      حذف
                    </Button>
                    <Button
                      onClick={() => handleDownloadPPTX(report)}
                      className="bg-green-500 hover:bg-green-600"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PPTX
                    </Button>
                    <Button
                      onClick={() => handleDownloadPDF(report)}
                      className="bg-purple-500 hover:bg-purple-600"
                      size="sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* ترقيم الصفحات */}
          <div className="flex justify-between items-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronRight className="h-4 w-4 ml-2" />
              السابق
            </Button>
            <span className="text-sm text-muted-foreground">
              الصفحة {page} من {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              التالي
              <ChevronLeft className="h-4 w-4 mr-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
