"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function KitchenPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [deliveryOrders, setDeliveryOrders] = useState([])
  const [menuItems, setMenuItems] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("new")
  const [servedOrders, setServedOrders] = useState([])
  const [isLogoutOpen, setIsLogoutOpen] = useState(false) // Modal holati

  // Menyu ma'lumotlarini bir marta olish
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch("https://oshxona.pythonanywhere.com/api/v2/menu/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) throw new Error("Menyu ma'lumotlarini olishda xatolik")

        const data = await response.json()
        const menuMap = {}
        data.forEach((item) => {
          menuMap[item.id] = {
            name: item.name,
            price: item.price,
            category: item.category,
            img: item.img,
          }
        })
        setMenuItems(menuMap)
      } catch (err) {
        console.error("Menyu ma'lumotlarini olishda xatolik:", err)
      }
    }

    fetchMenu()
  }, [])

  // Barcha buyurtmalarni bir marta olish
  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        const token = localStorage.getItem("token")

        if (!token) {
          console.log("Token topilmadi")
          router.push("/auth")
          return
        }

        const [ordersResponse, deliveryResponse, takeoutResponse, deliveryOrdersResponse, servedResponse] =
          await Promise.all([
            fetch("https://oshxona.pythonanywhere.com/api/v3/orders/", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("https://oshxona.pythonanywhere.com/api/v1/customer-deliveries/", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("https://oshxona.pythonanywhere.com/api/v3/takeout/", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("https://oshxona.pythonanywhere.com/api/v3/delivery/", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("https://oshxona.pythonanywhere.com/api/v3/served-all/", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ])

        if (
          !ordersResponse.ok ||
          !deliveryResponse.ok ||
          !takeoutResponse.ok ||
          !deliveryOrdersResponse.ok ||
          !servedResponse.ok
        ) {
          throw new Error("Buyurtmalarni yuklashda xatolik")
        }

        const [ordersData, deliveryData, takeoutData, deliveryOrdersData, servedData] = await Promise.all([
          ordersResponse.json(),
          deliveryResponse.json(),
          takeoutResponse.json(),
          deliveryOrdersResponse.json(),
          servedResponse.json(),
        ])

        const ordersWithDeliveryInfo = ordersData.map((order) => {
          if (order.order_type === "delivery") {
            const deliveryInfo = deliveryData.find((d) => d.phone === order.customer_phone)
            return {
              ...order,
              delivery_info: deliveryInfo,
            }
          }
          return order
        })

        setOrders(ordersWithDeliveryInfo)
        setDeliveryOrders(deliveryData)

        // Bajarilgan buyurtmalarni to'g'ri saqlash
        const servedOrdersArray = Array.isArray(servedData) ? servedData : servedData.orders || []
        setServedOrders([...servedOrdersArray, ...takeoutData, ...deliveryOrdersData])
      } catch (err) {
        console.error("Buyurtmalarni yuklashda xatolik:", err)
        setError("Buyurtmalarni yuklashda xatolik yuz berdi")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllOrders()
  }, [router])

  // Buyurtmalarni tablar bo'yicha filtrlash
  const filteredOrders = (tab) => {
    switch (tab) {
      case "new":
        return orders.filter((order) => order.status === "pending" || order.status === "new") // Faqat yangi buyurtmalar
      case "preparing":
        return orders.filter((order) => order.status === "preparing") // Tayyorlanmoqda
      case "ready":
        return orders.filter((order) => order.status === "ready") // Tayyor
      case "completed":
        return servedOrders // Bajarilgan
      default:
        return []
    }
  }

  // Buyurtma holatini "Tayyorlash"ga o'zgartirish
  const handleStartPreparing = async (orderId) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`https://oshxona.pythonanywhere.com/api/v3/orders/${orderId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "preparing" }),
      })

      if (!response.ok) throw new Error("Buyurtma holatini o'zgartirishda xatolik")

      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === orderId ? { ...order, status: "preparing" } : order)),
      )
    } catch (err) {
      console.error("Xatolik:", err)
      alert("Buyurtma holatini o'zgartirishda xatolik yuz berdi")
    }
  }

  // Buyurtma holatini "Tayyor"ga o'zgartirish
  const handleOrderReady = async (orderId) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`https://oshxona.pythonanywhere.com/api/v3/orders/${orderId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "ready",
          ready_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) throw new Error("Buyurtma holatini o'zgartirishda xatolik")

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: "ready", ready_at: new Date().toISOString() } : order,
        ),
      )
    } catch (err) {
      console.error("Xatolik:", err)
      alert("Buyurtma holatini o'zgartirishda xatolik yuz berdi")
    }
  }

  // Buyurtma holatini "Bajarilgan"ga o'zgartirish
  const handleCompleteOrder = async (orderId) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`https://oshxona.pythonanywhere.com/api/v3/orders/${orderId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "served" }),
      })

      if (!response.ok) throw new Error("Buyurtma holatini o'zgartirishda xatolik")

      const updatedOrder = orders.find((order) => order.id === orderId)
      if (updatedOrder) {
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
        setServedOrders((prevServed) => [
          ...prevServed,
          { ...updatedOrder, status: "served", completed_at: new Date().toISOString() },
        ])
        alert(`Buyurtma #${orderId} bajarildi!`)
      }
    } catch (err) {
      console.error("Xatolik:", err)
      alert("Buyurtma holatini o'zgartirishda xatolik yuz berdi")
    }
  }

  // Vaqtni formatlash funksiyasi
  const formatTime = (dateString) => {
    try {
      if (!dateString) return "Vaqt ko'rsatilmagan"
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Noto'g'ri vaqt formati"
      return date.toLocaleTimeString("uz-UZ", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch (error) {
      console.error("Vaqtni formatlashda xatolik:", error)
      return "Vaqtni formatlashda xatolik"
    }
  }

  // Vaqt farqini hisoblash funksiyasi
  const getTimeDifference = (dateString) => {
    try {
      if (!dateString) return "Vaqt ko'rsatilmagan"
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Noto'g'ri vaqt formati"
      const now = new Date()
      const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60)
      if (diff < 1) return "Hozirgina"
      if (diff < 60) return `${diff} daqiqa oldin`
      const hours = Math.floor(diff / 60)
      if (hours < 24) return `${hours} soat oldin`
      const days = Math.floor(hours / 24)
      return `${days} kun oldin`
    } catch (error) {
      console.error("Vaqt farqini hisoblashda xatolik:", error)
      return "Vaqtni hisoblashda xatolik"
    }
  }

  // Chiqish funksiyasi
  const handleLogout = () => {
    setIsLogoutOpen(true) // Modalni ochish
  }

  // Modal tasdiqlanganda chiqish
  const confirmLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refresh")
    localStorage.removeItem("user")
    router.push("/auth")
    setIsLogoutOpen(false) // Modalni yopish
  }

  // Buyurtma kartasi komponenti
  const OrderCard = ({ order, actionButton }) => {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <span>#{order.id}</span>
                <Badge variant={order.order_type === "delivery" ? "destructive" : "outline"}>
                  {order.order_type === "delivery"
                    ? "Yetkazib berish"
                    : order.order_type === "takeaway"
                      ? "Olib ketish"
                      : `${order.table}-stol`}
                </Badge>
              </CardTitle>

              {order.order_type === "delivery" && order.delivery_info && (
                <div className="mt-2 space-y-1 text-sm">
                  <div className="font-medium">{order.delivery_info.name}</div>
                  <div className="text-muted-foreground">Tel: {order.delivery_info.phone}</div>
                  <div className="text-muted-foreground">Manzil: {order.delivery_info.address}</div>
                </div>
              )}

              <div className="text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4 inline mr-1" />
                {formatTime(order.created_at || order.completed_at)}
              </div>
            </div>
            <Badge variant="secondary">{getTimeDifference(order.created_at || order.completed_at)}</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y">
            {order.items &&
              order.items.map((item, index) => {
                const menuItem = menuItems[item.menu_item]
                return (
                  <div key={index} className="p-3 flex items-center justify-between hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      {menuItem?.img && (
                        <img src={menuItem.img} alt={menuItem.name} className="w-12 h-12 rounded-md object-cover" />
                      )}
                      <div>
                        <div className="font-medium text-base">
                          {menuItem ? menuItem.name : `Taom #${item.menu_item}`}
                        </div>
                        <div className="text-sm text-muted-foreground">{menuItem?.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-medium">
                        x{item.quantity}
                      </Badge>
                      <div className="text-sm">
                        {menuItem ? (Number(menuItem.price) * item.quantity).toLocaleString() : 0} so'm
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>

        {actionButton && <CardFooter className="border-t p-2">{actionButton}</CardFooter>}
      </Card>
    )
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Yuklanmoqda...</div>
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Oshxona</h1>
        </div>
        <div className="flex items-center space-x-4">
          <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Chiqishni tasdiqlaysizmi?</AlertDialogTitle>
                <AlertDialogDescription>Haqiqatan ham tizimdan chiqmoqchimisiz?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Yo'q</AlertDialogCancel>
                <AlertDialogAction onClick={confirmLogout}>Ha</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4 mb-4">
            <TabsTrigger value="new">Yangi</TabsTrigger>
            <TabsTrigger value="preparing">Tayyorlanmoqda</TabsTrigger>
            <TabsTrigger value="ready">Tayyor</TabsTrigger>
            <TabsTrigger value="completed">Bajarilgan</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-0">
            {filteredOrders("new").length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">Yangi buyurtmalar yo'q</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders("new").map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actionButton={
                      <Button
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => handleStartPreparing(order.id)}
                      >
                        Tayyorlashni boshlash
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preparing" className="mt-0">
            {filteredOrders("preparing").length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Tayyorlanayotgan buyurtmalar yo'q
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders("preparing").map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actionButton={
                      <Button
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => handleOrderReady(order.id)}
                      >
                        Tayyor
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ready" className="mt-0">
            {filteredOrders("ready").length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">Tayyor buyurtmalar yo'q</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders("ready").map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    actionButton={
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleCompleteOrder(order.id)}
                      >
                        Bajarilgan
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-0">
            {filteredOrders("completed").length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Bajarilgan buyurtmalar yo'q
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders("completed").map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
