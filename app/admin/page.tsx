"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { PageHeader } from "@/components/ui-custom/page-header"
import { Shield, UserPlus, Users, Check, X, Smartphone, Edit3, LogOut, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface UserCountSummary {
  user_id: string
  username: string
  total_reports: number
  active_reports: number
  deleted_reports: number
  last_report_created_at: string | null
}

interface User {
  id: string
  username: string
  password?: string
  created_at: string
}

interface Device {
  id: string
  user_id: string
  device_id: string
  is_approved: boolean
  created_at: string
  username?: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [userCounts, setUserCounts] = useState<UserCountSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserReports, setSelectedUserReports] = useState<any[]>([])
  const [loadingUserReports, setLoadingUserReports] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    username: "",
    password: "",
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchUsers()
    fetchDevices()
    fetchUserCounts()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, password, created_at")
        .order("created_at", { ascending: false })

      if (error) {
        throw new Error("حدث خطأ أثناء جلب المستخدمين")
      }

      setUsers(data || [])
    } catch (err: any) {
      console.error(err)
    }
  }

  const fetchDevices = async () => {
    try {
      // جلب الأجهزة مع اسم المستخدم
      const { data, error } = await supabase
        .from("authorized_devices")
        .select(`
          id, 
          user_id, 
          device_id, 
          is_approved, 
          created_at,
          users:user_id (username)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        throw new Error("حدث خطأ أثناء جلب الأجهزة")
      }

      // تنسيق البيانات
      const formattedDevices =
        data?.map((device) => ({
          ...device,
          username: device.users?.username,
        })) || []

      setDevices(formattedDevices)
    } catch (err: any) {
      console.error(err)
    }
  }

  const fetchUserCounts = async () => {
    try {
      const { data, error } = await supabase.from("user_report_counts").select("*").order("username", { ascending: true })
      if (error) throw error
      setUserCounts((data as UserCountSummary[]) || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchReportsForUser = async (userId: string) => {
    setLoadingUserReports(true)
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (error) throw error
      setSelectedUserReports(data || [])
    } catch (err) {
      console.error(err)
      setSelectedUserReports([])
    } finally {
      setLoadingUserReports(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // التحقق من كلمة المرور
      if (newUser.password !== newUser.confirmPassword) {
        throw new Error("كلمة المرور وتأكيد كلمة المرور غير متطابقين")
      }

      // التحقق من وجود اسم المستخدم
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", newUser.username)
        .single()

      if (existingUser) {
        throw new Error("اسم المستخدم موجود بالفعل")
      }

      // إضافة المستخدم الجديد
      const { error: insertError } = await supabase.from("users").insert({
        username: newUser.username,
        password: newUser.password, // في التطبيق الحقيقي، يجب تشفير كلمة المرور
      })

      if (insertError) {
        throw new Error("حدث خطأ أثناء إضافة المستخدم")
      }

      setSuccess("تمت إضافة المستخدم بنجاح")
      setNewUser({
        username: "",
        password: "",
        confirmPassword: "",
      })

      // تحديث قائمة المستخدمين
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase.from("authorized_devices").update({ is_approved: true }).eq("id", deviceId)

      if (error) {
        throw new Error("حدث خطأ أثناء الموافقة على الجهاز")
      }

      // تحديث قائمة الأجهزة
      fetchDevices()
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { error } = await supabase
        .from("users")
        .update({
          username: editForm.username,
          password: editForm.password,
        })
        .eq("id", editingUser.id)

      if (error) throw error

      setSuccess("تم تحديث بيانات المستخدم بنجاح")
      setIsEditDialogOpen(false)
      fetchUsers()
      fetchUserCounts()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutAllDevices = async (userId: string) => {
    if (!confirm("هل أنت متأكد من تسجيل خروج هذا المستخدم من جميع أجهزته؟")) return

    setActionLoading(userId)
    setSuccess(null)
    setError(null)

    try {
      const { error } = await supabase.from("authorized_devices").delete().eq("user_id", userId)

      if (error) throw error

      setSuccess("تم تسجيل خروج المستخدم من جميع الأجهزة بنجاح")
      fetchDevices()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({
      username: user.username,
      password: user.password || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleRejectDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase.from("authorized_devices").delete().eq("id", deviceId)

      if (error) {
        throw new Error("حدث خطأ أثناء رفض الجهاز")
      }

      // تحديث قائمة الأجهزة
      fetchDevices()
    } catch (err: any) {
      console.error(err)
    }
  }

  // تنسيق التاريخ
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <PageHeader
        title="لوحة تحكم المسؤول"
        description="إدارة المستخدمين والأجهزة"
        icon={<Shield className="h-8 w-8" />}
      />

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="devices">الأجهزة</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          {/* Summary list with per-user counts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="mr-2 h-5 w-5" />
                إحصائيات المستخدمين
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userCounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا توجد بيانات تقارير</p>
              ) : (
                <div className="space-y-2">
                  {userCounts.map((uc) => (
                    <div
                      key={uc.user_id}
                      className={`p-3 border rounded-md flex items-center justify-between cursor-pointer ${
                        selectedUserId === uc.user_id ? "bg-indigo-50 border-indigo-200" : ""
                      }`}
                      onClick={() => {
                        setSelectedUserId(uc.user_id)
                        fetchReportsForUser(uc.user_id)
                      }}
                    >
                      <div>
                        <p className="font-medium">{uc.username}</p>
                        <p className="text-xs text-muted-foreground">
                          إجمالي: {uc.total_reports} • نشط: {uc.active_reports} • محذوف: {uc.deleted_reports}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        آخر إضافة: {uc.last_report_created_at ? new Date(uc.last_report_created_at).toLocaleString("ar-SA") : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <UserPlus className="mr-2 h-5 w-5" />
                إضافة مستخدم جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                {error && <AlertMessage type="error" title="خطأ" message={error} />}
                {success && <AlertMessage type="success" title="نجاح" message={success} />}
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="أدخل اسم المستخدم"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="أدخل تأكيد كلمة المرور"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
                  {loading ? "جاري الإضافة..." : "إضافة المستخدم"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="mr-2 h-5 w-5" />
                قائمة المستخدمين والإدارة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا يوجد مستخدمين</p>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => {
                    const stats = userCounts.find((uc) => uc.user_id === user.id)
                    return (
                      <div key={user.id} className="p-4 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-bold text-lg text-blue-900">{user.username}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>📅 {formatDate(user.created_at)}</span>
                                <span className="text-blue-600 font-mono">🔑 {user.password}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit3 className="h-4 w-4" />
                                <span className="sr-only">تعديل</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleLogoutAllDevices(user.id)}
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <LogOut className="h-4 w-4" />
                                )}
                                <span className="sr-only">تسجيل خروج من جميع الأجهزة</span>
                              </Button>
                            </div>
                          </div>

                          {stats && (
                            <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-50 bg-gray-50/50 rounded px-2">
                              <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase">الإجمالي</p>
                                <p className="font-bold text-gray-700">{stats.total_reports}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-green-600 uppercase">النشطة</p>
                                <p className="font-bold text-green-700">{stats.active_reports}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-red-400 uppercase">المحذوفة</p>
                                <p className="font-bold text-red-500">{stats.deleted_reports}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1">
                            <p className="text-[10px] text-muted-foreground italic">
                              آخر نشاط: {stats?.last_report_created_at ? new Date(stats.last_report_created_at).toLocaleDateString("ar-SA") : "لا يوجد"}
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] text-blue-600 hover:text-blue-800"
                              onClick={() => {
                                setSelectedUserId(user.id)
                                fetchReportsForUser(user.id)
                              }}
                            >
                              {selectedUserId === user.id ? "إخفاء التقارير" : "عرض التقارير"}
                            </Button>
                          </div>
                        </div>

                        {selectedUserId === user.id && (
                          <div className="mt-3 border-t pt-3 animate-in slide-in-from-top-2 duration-300">
                            {loadingUserReports ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                              </div>
                            ) : selectedUserReports.length === 0 ? (
                              <p className="text-sm text-center text-muted-foreground py-2 italic">لا يوجد تقارير مسجلة</p>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {selectedUserReports.map((r) => (
                                  <div key={r.id} className="p-2.5 rounded-md bg-blue-50/30 border border-blue-100">
                                    <div className="flex justify-between text-[11px] font-medium text-blue-900">
                                      <span>رمز: {r.service_code}</span>
                                      <span>هوية: {r.id_number}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1 text-left">
                                      {new Date(r.created_at).toLocaleString("ar-SA")}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-right">تعديل بيانات المستخدم</DialogTitle>
                <DialogDescription className="text-right">قم بتعديل اسم المستخدم أو كلمة المرور الخاصة به.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateUser} className="space-y-4 py-4 pr-1">
                <div className="space-y-2 text-right">
                  <Label htmlFor="edit-username">اسم المستخدم</Label>
                  <Input
                    id="edit-username"
                    value={editForm.username}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                    className="text-right"
                    required
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label htmlFor="edit-password">كلمة المرور</Label>
                  <Input
                    id="edit-password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="text-right font-mono"
                    required
                  />
                </div>
                <DialogFooter className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                    إلغاء
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التغييرات"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Smartphone className="mr-2 h-5 w-5" />
                طلبات الأجهزة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا توجد طلبات أجهزة</p>
              ) : (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div key={device.id} className="p-4 border rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{device.username}</p>
                          <p className="text-xs text-muted-foreground">
                            معرف الجهاز: {device.device_id.substring(0, 10)}...
                          </p>
                          <p className="text-xs text-muted-foreground">تاريخ الطلب: {formatDate(device.created_at)}</p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs ${device.is_approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                        >
                          {device.is_approved ? "تمت الموافقة" : "في الانتظار"}
                        </div>
                      </div>
                      {!device.is_approved && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() => handleApproveDevice(device.id)}
                            className="flex-1 bg-green-500 hover:bg-green-600"
                            size="sm"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            موافقة
                          </Button>
                          <Button
                            onClick={() => handleRejectDevice(device.id)}
                            className="flex-1 bg-red-500 hover:bg-red-600"
                            size="sm"
                          >
                            <X className="mr-2 h-4 w-4" />
                            رفض
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
