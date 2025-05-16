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
import { Shield, UserPlus, Users, Check, X, Smartphone } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface User {
  id: string
  username: string
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
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchUsers()
    fetchDevices()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, created_at")
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
                قائمة المستخدمين
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا يوجد مستخدمين</p>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="p-4 border rounded-md flex justify-between items-center">
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">تاريخ الإنشاء: {formatDate(user.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
