"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import {
  SearchIcon,
  LogOut,
  SettingsIcon,
  Loader2,
  User,
  Bell,
  FileBarChart,
  FilePlus,
  FileEdit,
  FileX,
  ChevronRight,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

export default function HomePage() {
  const router = useRouter()
  const [serviceCode, setServiceCode] = useState("")
  const [idNumber, setIdNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalReports: 0,
    deletedReports: 0,
    activeReports: 0,
  })
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const supabase = createClientSupabaseClient()

  // useEffect(() => {
  //   // التحقق من تسجيل الدخول
  //   const userId = localStorage.getItem("user_id")
  //   const storedUsername = localStorage.getItem("username")

  //   if (!userId) {
  //     router.push("/")
  //     return
  //   }

  //   if (storedUsername) {
  //     setUsername(storedUsername)
  //   }

  //   // جلب إحصائيات التقارير
  //   fetchReportStats(userId)
  // }, [router])

  const fetchReportStats = async (userId: string) => {
    setIsLoading(true)
    try {
      // جلب إجمالي التقارير
      const { count: totalCount, error: totalError } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // جلب التقارير المحذوفة
      const { count: deletedCount, error: deletedError } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_deleted", true)

      if (totalError || deletedError) {
        throw new Error("حدث خطأ أثناء جلب الإحصائيات")
      }

      setStats({
        totalReports: totalCount || 0,
        deletedReports: deletedCount || 0,
        activeReports: (totalCount || 0) - (deletedCount || 0),
      })
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!serviceCode && !idNumber) {
      setError("يرجى إدخال رمز الخدمة أو رقم الهوية")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const userId = localStorage.getItem("user_id")
      let query = supabase.from("reports").select("*").eq("user_id", userId).eq("is_deleted", false)

      if (serviceCode) {
        query = query.eq("service_code", serviceCode)
      }

      if (idNumber) {
        query = query.eq("id_number", idNumber)
      }

      const { data, error: searchError } = await query

      if (searchError) {
        throw new Error("حدث خطأ أثناء البحث")
      }

      if (!data || data.length === 0) {
        setError("لم يتم العثور على نتائج")
        return
      }

      // تخزين نتائج البحث وتوجيه المستخدم إلى صفحة البحث
      localStorage.setItem("search_results", JSON.stringify(data))
      router.push("/search")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("user_id")
    localStorage.removeItem("username")
    router.push("/")
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getCompletionPercentage = () => {
    if (stats.totalReports === 0) return 0
    return Math.round((stats.activeReports / stats.totalReports) * 100)
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <motion.div
        className="flex justify-between items-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg">
            <AvatarFallback>{getInitials(username || "مستخدم")}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              مرحباً
            </h1>
            <p className="text-gray-600">{username || "المستخدم"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  2
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">تم إضافة تقرير جديد</span>
                  <span className="text-xs text-muted-foreground">منذ 5 دقائق</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium">تمت الموافقة على جهازك</span>
                  <span className="text-xs text-muted-foreground">منذ ساعة</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-full"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>حسابي</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>
                <SettingsIcon className="ml-2 h-4 w-4" />
                <span>الإعدادات</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                <LogOut className="ml-2 h-4 w-4" />
                <span>تسجيل الخروج</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card overflow-hidden border-none shadow-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="text-indigo-900">لوحة التحكم</span>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                {isLoading ? "جاري التحميل..." : `${stats.totalReports} تقرير`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
                <span className="text-2xl font-bold text-blue-600">{stats.totalReports}</span>
                <span className="text-xs text-blue-700">إجمالي</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                <span className="text-2xl font-bold text-green-600">{stats.activeReports}</span>
                <span className="text-xs text-green-700">نشط</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 shadow-sm">
                <span className="text-2xl font-bold text-red-600">{stats.deletedReports}</span>
                <span className="text-xs text-red-700">محذوف</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">نسبة الإنجاز</span>
                <span className="text-sm font-medium">{getCompletionPercentage()}%</span>
              </div>
              <Progress
                value={getCompletionPercentage()}
                className="h-2 bg-gray-100"
                indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">الإجراءات السريعة</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 p-1 h-auto"
            onClick={() => setShowSearch(!showSearch)}
          >
            <SearchIcon className="h-5 w-5" />
          </Button>
        </div>

        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 overflow-hidden"
            >
              <Card className="glass-card overflow-hidden border-none shadow-lg bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
                <CardContent className="p-4">
                  <form onSubmit={handleSearch} className="space-y-3">
                    {error && (
                      <AlertMessage type="error" title="خطأ في البحث" message={error} onClose={() => setError(null)} />
                    )}
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={serviceCode}
                        onChange={(e) => setServiceCode(e.target.value)}
                        placeholder="رمز الخدمة"
                        className="border-indigo-200 focus:border-indigo-400 bg-white/70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="رقم الهوية"
                        className="border-indigo-200 focus:border-indigo-400 bg-white/70"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          جاري البحث...
                        </>
                      ) : (
                        <>
                          <SearchIcon className="ml-2 h-4 w-4" />
                          بحث
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="col-span-2">
            <Button
              onClick={() => router.push("/add")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-blue-400/30 p-2 rounded-lg mr-3">
                  <FilePlus className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">إضافة تقرير</div>
                  <div className="text-xs text-blue-100">إنشاء تقرير جديد</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => router.push("/edit")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-amber-400/30 p-2 rounded-lg mr-3">
                  <FileEdit className="h-5 w-5" />
                </div>
                <span className="font-bold">تعديل</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => router.push("/delete")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-red-400/30 p-2 rounded-lg mr-3">
                  <FileX className="h-5 w-5" />
                </div>
                <span className="font-bold">حذف</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="col-span-2">
            <Button
              onClick={() => router.push("/reports")}
              className="w-full h-auto py-4 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-between"
            >
              <div className="flex items-center">
                <div className="bg-purple-400/30 p-2 rounded-lg mr-3">
                  <FileBarChart className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">التقارير</div>
                  <div className="text-xs text-purple-100">عرض جميع التقارير</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="glass-card overflow-hidden border-none shadow-lg bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="text-indigo-900">آخر النشاطات</span>
              <Badge variant="outline" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                جديد
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-full ml-3">
                    <FilePlus className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">تم إضافة تقرير جديد</p>
                    <p className="text-xs text-gray-500">منذ 30 دقيقة</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-indigo-600">
                  عرض
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="bg-amber-100 p-2 rounded-full ml-3">
                    <FileEdit className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">تم تعديل تقرير</p>
                    <p className="text-xs text-gray-500">منذ ساعتين</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-indigo-600">
                  عرض
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
