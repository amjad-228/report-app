"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { addActivity } from "@/lib/activities-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { BackButton } from "@/components/ui-custom/back-button"
import {
  PlusCircle,
  Download,
  RefreshCw,
  Calendar,
  User,
  Hash,
  Clock,
  Flag,
  FileText,
  Building,
  UserCheck,
  Loader2,
  Save,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { downloadPptxViaApi, downloadPdfViaApi } from "@/lib/pptx-service"

interface FormData {
  service_code: string
  id_number: string
  name_ar: string
  name_en: string
  days_count: string
  entry_date_gregorian: string
  exit_date_gregorian: string
  entry_date_hijri: string
  exit_date_hijri: string
  report_issue_date: string
  nationality_ar: string
  nationality_en: string
  doctor_name_ar: string
  doctor_name_en: string
  job_title_ar: string
  job_title_en: string
  hospital_name_ar: string
  hospital_name_en: string
  print_date: string
  print_time: string
}

const FormField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  readOnly = false,
  icon: Icon,
  hint,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  required?: boolean
  readOnly?: boolean
  icon?: React.ElementType
  hint?: string
}) => (
  <motion.div className="space-y-2" variants={{
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  }}>
    <Label htmlFor={name} className="text-indigo-900 flex items-center gap-1.5">
      {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
      {label}
      {required && <span className="text-red-500">*</span>}
    </Label>
    <div className="relative">
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`border-indigo-200 focus:border-indigo-400 ${readOnly ? "bg-gray-50" : ""}`}
      />
    </div>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </motion.div>
)

export default function AddReportPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    service_code: "",
    id_number: "",
    name_ar: "",
    name_en: "",
    days_count: "",
    entry_date_gregorian: "",
    exit_date_gregorian: "",
    entry_date_hijri: "",
    exit_date_hijri: "",
    report_issue_date: "",
    nationality_ar: "السعودية",
    nationality_en: "Saudi Arabia",
    doctor_name_ar: "",
    doctor_name_en: "",
    job_title_ar: "طبيب",
    job_title_en: "Doctor",
    hospital_name_ar: "",
    hospital_name_en: "",
    print_date: "",
    print_time: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // إضافة متغير حالة للتبويب النشط
  const [activeTab, setActiveTab] = useState("basic")
  const supabase = createClientSupabaseClient()

  const tabs = ["basic", "dates", "additional"]
  const tabLabels = {
    basic: "البيانات الأساسية",
    dates: "التواريخ",
    additional: "بيانات إضافية",
  }

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      router.push("/")
    }

    // تعيين التاريخ والوقت الحاليين
    const now = new Date()
    const today = now.toISOString().split("T")[0]

    // تنسيق التاريخ مثل "Tuesday, 22 April 2025"
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
    const formattedDate = now.toLocaleDateString("en-US", options)

    // تنسيق الوقت مثل "12:32 PM"
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    setFormData((prev) => ({
      ...prev,
      entry_date_gregorian: today,
      report_issue_date: today,
      print_date: formattedDate,
      print_time: formattedTime,
    }))
  }, [router])

  // حساب تاريخ الخروج بناءً على تاريخ الدخول وعدد الأيام
  useEffect(() => {
    if (formData.entry_date_gregorian && formData.days_count) {
      const entryDate = new Date(formData.entry_date_gregorian)
      const days = Number.parseInt(formData.days_count)

      if (!isNaN(days)) {
        const exitDate = new Date(entryDate)
        exitDate.setDate(exitDate.getDate() + days)

        setFormData((prev) => ({
          ...prev,
          exit_date_gregorian: exitDate.toISOString().split("T")[0],
        }))
      }
    }
  }, [formData.entry_date_gregorian, formData.days_count])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const userId = localStorage.getItem("user_id")
      if (!userId) {
        router.push("/")
        return
      }

      const supabase = createClientSupabaseClient()

      // تحويل البيانات إلى النموذج المطلوب
      const reportData = {
        ...formData,
        days_count: parseInt(formData.days_count),
        user_id: userId,
        is_deleted: false,
      }

      const { data, error: insertError } = await supabase.from("reports").insert(reportData).select()

      if (insertError) {
        throw new Error("حدث خطأ أثناء حفظ التقرير")
      }

      // إضافة نشاط جديد
      if (data && data.length > 0) {
        const reportId = data[0].id
        await addActivity(
          userId,
          "add",
          "تم إضافة تقرير جديد",
          `تم إضافة تقرير جديد للمريض ${formData.name_ar} برقم هوية ${formData.id_number}`,
          reportId,
        )
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      service_code: "",
      id_number: "",
      name_ar: "",
      name_en: "",
      days_count: "",
      entry_date_gregorian: new Date().toISOString().split("T")[0],
      exit_date_gregorian: "",
      entry_date_hijri: "",
      exit_date_hijri: "",
      report_issue_date: new Date().toISOString().split("T")[0],
      nationality_ar: "السعودية",
      nationality_en: "Saudi Arabia",
      doctor_name_ar: "",
      doctor_name_en: "",
      job_title_ar: "طبيب",
      job_title_en: "Doctor",
      hospital_name_ar: "",
      hospital_name_en: "",
      print_date: formData.print_date,
      print_time: formData.print_time,
    })
    setSuccess(false)
    setError(null)
  }

  const handleDownloadPPTX = async () => {
    const userId = localStorage.getItem("user_id")
    if (!userId) return

    try {
      await downloadPptxViaApi({
        SERVICE_CODE: formData.service_code,
        ID_NUMBER: formData.id_number,
        NAME_AR: formData.name_ar,
        NAME_EN: formData.name_en,
        DAYS_COUNT: parseInt(formData.days_count) || 0,
        ENTRY_DATE_GREGORIAN: formData.entry_date_gregorian,
        EXIT_DATE_GREGORIAN: formData.exit_date_gregorian,
        ENTRY_DATE_HIJRI: formData.entry_date_hijri,
        EXIT_DATE_HIJRI: formData.exit_date_hijri,
        REPORT_ISSUE_DATE: formData.report_issue_date,
        NATIONALITY_AR: formData.nationality_ar,
        NATIONALITY_EN: formData.nationality_en,
        DOCTOR_NAME_AR: formData.doctor_name_ar,
        DOCTOR_NAME_EN: formData.doctor_name_en,
        JOB_TITLE_AR: formData.job_title_ar,
        JOB_TITLE_EN: formData.job_title_en,
        HOSPITAL_NAME_AR: formData.hospital_name_ar,
        HOSPITAL_NAME_EN: formData.hospital_name_en,
        PRINT_DATE: formData.print_date,
        PRINT_TIME: formData.print_time,
      })
    } catch (e) {
      setError("حدث خطأ أثناء تنزيل ملف PPTX")
    }
  }

  const handleDownloadPDF = async () => {
    const userId = localStorage.getItem("user_id")
    if (!userId) return
    try {
      await downloadPdfViaApi({
        SERVICE_CODE: formData.service_code,
        ID_NUMBER: formData.id_number,
        NAME_AR: formData.name_ar,
        NAME_EN: formData.name_en,
        DAYS_COUNT: parseInt(formData.days_count) || 0,
        ENTRY_DATE_GREGORIAN: formData.entry_date_gregorian,
        EXIT_DATE_GREGORIAN: formData.exit_date_gregorian,
        ENTRY_DATE_HIJRI: formData.entry_date_hijri,
        EXIT_DATE_HIJRI: formData.exit_date_hijri,
        REPORT_ISSUE_DATE: formData.report_issue_date,
        NATIONALITY_AR: formData.nationality_ar,
        NATIONALITY_EN: formData.nationality_en,
        DOCTOR_NAME_AR: formData.doctor_name_ar,
        DOCTOR_NAME_EN: formData.doctor_name_en,
        JOB_TITLE_AR: formData.job_title_ar,
        JOB_TITLE_EN: formData.job_title_en,
        HOSPITAL_NAME_AR: formData.hospital_name_ar,
        HOSPITAL_NAME_EN: formData.hospital_name_en,
        PRINT_DATE: formData.print_date,
        PRINT_TIME: formData.print_time,
      })
    } catch (e) {
      setError("حدث خطأ أثناء تنزيل ملف PDF")
    }
  }

  // إضافة دالة للانتقال إلى التبويب التالي
  const handleNextTab = () => {
    if (activeTab === "basic") {
      setActiveTab("dates")
    } else if (activeTab === "dates") {
      setActiveTab("additional")
    }
  }

  // إضافة دالة للانتقال إلى التبويب السابق
  const handlePrevTab = () => {
    if (activeTab === "additional") {
      setActiveTab("dates")
    } else if (activeTab === "dates") {
      setActiveTab("basic")
    }
  }

  const getCurrentTabIndex = () => {
    return tabs.indexOf(activeTab) + 1
  }

  const getProgressPercentage = () => {
    return (getCurrentTabIndex() / tabs.length) * 100
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

  

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <BackButton />
      <PageHeader
        title={<span className="gradient-heading text-2xl">إضافة تقرير جديد</span>}
        description="أدخل بيانات التقرير الجديد"
        icon={<PlusCircle className="h-8 w-8 text-blue-600" />}
      />

      <motion.div initial="hidden" animate="visible" variants={containerVariants}>
        <Card className="glass-card overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="ml-2 h-5 w-5 text-blue-600" />
                <span>بيانات التقرير</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-blue-600 font-bold">{getCurrentTabIndex()}</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-500">{tabs.length}</span>
              </div>
            </CardTitle>
            <div className="mt-2">
              <Progress
                value={getProgressPercentage()}
                className="h-2 bg-gray-100"
                indicatorClassName="bg-gradient-to-r from-blue-500 to-blue-600"
              />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <AlertMessage type="error" title="خطأ في حفظ التقرير" message={error} onClose={() => setError(null)} />
              )}
              {success && <AlertMessage type="success" title="تم الحفظ بنجاح" message="تم حفظ التقرير بنجاح" />}

              {/* تحديث مكون Tabs ليستخدم activeTab */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger
                    value="basic"
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <div className="flex items-center gap-1">
                      {activeTab === "basic" && <Check className="h-3 w-3" />}
                      <span>البيانات الأساسية</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="dates"
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <div className="flex items-center gap-1">
                      {activeTab === "dates" && <Check className="h-3 w-3" />}
                      <span>التواريخ</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="additional"
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                  >
                    <div className="flex items-center gap-1">
                      {activeTab === "additional" && <Check className="h-3 w-3" />}
                      <span>بيانات إضافية</span>
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <FormField
                    label="رمز الخدمة"
                    name="service_code"
                    value={formData.service_code}
                    onChange={handleChange}
                    placeholder="أدخل رمز الخدمة"
                    required
                    icon={Hash}
                  />

                  <FormField
                    label="رقم الهوية"
                    name="id_number"
                    value={formData.id_number}
                    onChange={handleChange}
                    placeholder="أدخل رقم الهوية"
                    required
                    icon={Hash}
                  />

                  <FormField
                    label="الاسم (عربي)"
                    name="name_ar"
                    value={formData.name_ar}
                    onChange={handleChange}
                    placeholder="أدخل الاسم باللغة العربية"
                    required
                    icon={User}
                  />

                  <FormField
                    label="الاسم (إنجليزي)"
                    name="name_en"
                    value={formData.name_en}
                    onChange={handleChange}
                    placeholder="أدخل الاسم باللغة الإنجليزية"
                    required
                    icon={User}
                  />

                  <FormField
                    label="عدد الأيام"
                    name="days_count"
                    type="number"
                    value={formData.days_count}
                    onChange={handleChange}
                    placeholder="أدخل عدد الأيام"
                    required
                    icon={Calendar}
                  />
                </TabsContent>

                <TabsContent value="dates" className="space-y-4">
                  <FormField
                    label="تاريخ الدخول (ميلادي)"
                    name="entry_date_gregorian"
                    type="date"
                    value={formData.entry_date_gregorian}
                    onChange={handleChange}
                    required
                    icon={Calendar}
                  />

                  <FormField
                    label="تاريخ الخروج (ميلادي)"
                    name="exit_date_gregorian"
                    type="date"
                    value={formData.exit_date_gregorian}
                    onChange={handleChange}
                    readOnly
                    icon={Calendar}
                    hint="(يتم حسابه تلقائيًا بناءً على تاريخ الدخول وعدد الأيام)"
                  />

                  <FormField
                    label="تاريخ الدخول (هجري)"
                    name="entry_date_hijri"
                    value={formData.entry_date_hijri}
                    onChange={handleChange}
                    placeholder="أدخل تاريخ الدخول الهجري"
                    required
                    icon={Calendar}
                  />

                  <FormField
                    label="تاريخ الخروج (هجري)"
                    name="exit_date_hijri"
                    value={formData.exit_date_hijri}
                    onChange={handleChange}
                    placeholder="أدخل تاريخ الخروج الهجري"
                    icon={Calendar}
                    hint="(يتم حسابه تلقائيًا في التطبيق الحقيقي)"
                  />

                  <FormField
                    label="تاريخ إصدار التقرير"
                    name="report_issue_date"
                    type="date"
                    value={formData.report_issue_date}
                    onChange={handleChange}
                    required
                    icon={Calendar}
                  />
                </TabsContent>

                <TabsContent value="additional" className="space-y-4">
                  <FormField
                    label="الجنسية (عربي)"
                    name="nationality_ar"
                    value={formData.nationality_ar}
                    onChange={handleChange}
                    placeholder="أدخل الجنسية باللغة العربية"
                    required
                    icon={Flag}
                  />

                  <FormField
                    label="الجنسية (إنجليزي)"
                    name="nationality_en"
                    value={formData.nationality_en}
                    onChange={handleChange}
                    placeholder="أدخل الجنسية باللغة الإنجليزية"
                    required
                    icon={Flag}
                  />

                  <FormField
                    label="اسم الطبيب (عربي)"
                    name="doctor_name_ar"
                    value={formData.doctor_name_ar}
                    onChange={handleChange}
                    placeholder="أدخل اسم الطبيب باللغة العربية"
                    required
                    icon={UserCheck}
                  />

                  <FormField
                    label="اسم الطبيب (إنجليزي)"
                    name="doctor_name_en"
                    value={formData.doctor_name_en}
                    onChange={handleChange}
                    placeholder="أدخل اسم الطبيب باللغة الإنجليزية"
                    required
                    icon={UserCheck}
                  />

                  <FormField
                    label="المسمى الوظيفي (عربي)"
                    name="job_title_ar"
                    value={formData.job_title_ar}
                    onChange={handleChange}
                    placeholder="أدخل المسمى الوظيفي باللغة العربية"
                    required
                    icon={UserCheck}
                  />

                  <FormField
                    label="المسمى الوظيفي (إنجليزي)"
                    name="job_title_en"
                    value={formData.job_title_en}
                    onChange={handleChange}
                    placeholder="أدخل المسمى الوظيفي باللغة الإنجليزية"
                    required
                    icon={UserCheck}
                  />

                  <FormField
                    label="اسم المستشفى (عربي)"
                    name="hospital_name_ar"
                    value={formData.hospital_name_ar}
                    onChange={handleChange}
                    placeholder="أدخل اسم المستشفى باللغة العربية"
                    required
                    icon={Building}
                  />

                  <FormField
                    label="اسم المستشفى (إنجليزي)"
                    name="hospital_name_en"
                    value={formData.hospital_name_en}
                    onChange={handleChange}
                    placeholder="أدخل اسم المستشفى باللغة الإنجليزية"
                    required
                    icon={Building}
                  />

                  <FormField
                    label="تاريخ الطباعة"
                    name="print_date"
                    value={formData.print_date}
                    onChange={handleChange}
                    placeholder="مثال: Tuesday, 22 April 2025"
                    required
                    icon={Calendar}
                  />

                  <FormField
                    label="وقت الطباعة"
                    name="print_time"
                    value={formData.print_time}
                    onChange={handleChange}
                    placeholder="مثال: 12:32 PM"
                    required
                    icon={Clock}
                  />
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />

              {/* استبدال أزرار الإرسال والإلغاء بأزرار التالي والسابق */}
              <motion.div className="flex gap-2" variants={itemVariants}>
                {activeTab !== "basic" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={handlePrevTab}
                  >
                    <ArrowRight className="ml-2 h-4 w-4" />
                    السابق
                  </Button>
                )}

                {activeTab !== "additional" ? (
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                    onClick={handleNextTab}
                  >
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    التالي
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="ml-2 h-4 w-4" />
                        حفظ التقرير
                      </>
                    )}
                  </Button>
                )}
              </motion.div>

              {activeTab === "additional" && (
                <motion.div variants={itemVariants}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => router.push("/home")}
                  >
                    <X className="ml-2 h-4 w-4" />
                    إلغاء
                  </Button>
                </motion.div>
              )}
            </form>
          </CardContent>
          {success && (
            <CardFooter className="flex flex-col space-y-3 bg-blue-50 border-t border-blue-100 p-4">
              <motion.div
                className="flex gap-2 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={handleDownloadPPTX}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                >
                  <Download className="ml-2 h-4 w-4" />
                  تنزيل PPTX
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md"
                >
                  <Download className="ml-2 h-4 w-4" />
                  تنزيل PDF
                </Button>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Button
                  onClick={handleReset}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                >
                  <RefreshCw className="ml-2 h-4 w-4" />
                  إدخال تقرير جديد
                </Button>
              </motion.div>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
