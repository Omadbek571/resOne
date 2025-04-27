"use client"

import { useState, useEffect } from "react"
import { Clock, Check, ChefHat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Mock data for monitor display
const mockOrders = [
  {
    id: 1,
    table: "Stol 3",
    orderType: "dine-in",
    items: [
      { id: 1, name: "Osh", quantity: 2 },
      { id: 2, name: "Lag'mon", quantity: 1 },
      { id: 3, name: "Coca-Cola", quantity: 3 },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    status: "preparing",
  },
  {
    id: 2,
    orderType: "takeaway",
    customer: { name: "Alisher", phone: "+998 90 123 45 67" },
    items: [
      { id: 1, name: "Burger", quantity: 2 },
      { id: 2, name: "Lavash", quantity: 1 },
      { id: 3, name: "Pepsi", quantity: 2 },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
    status: "ready",
  },
  {
    id: 3,
    orderType: "delivery",
    customer: {
      name: "Dilshod",
      phone: "+998 90 987 65 43",
      address: "Toshkent sh., Chilonzor tumani, 19-kvartal, 5-uy",
    },
    items: [
      { id: 1, name: "Shashlik", quantity: 4 },
      { id: 2, name: "Qo'y sho'rva", quantity: 1 },
      { id: 3, name: "Non", quantity: 2 },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    status: "new",
  },
  {
    id: 4,
    table: "Stol 5",
    orderType: "dine-in",
    items: [
      { id: 1, name: "Qaymoqli tort", quantity: 1 },
      { id: 2, name: "Choy", quantity: 2 },
    ],
    timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
    status: "ready",
  },
]

export default function MonitorPage() {
  const [orders, setOrders] = useState(mockOrders)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
  }

  const getTimeDifference = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60)
    return `${diff} daqiqa`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge className="bg-blue-100 text-blue-800">Yangi</Badge>
      case "preparing":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <ChefHat className="h-3 w-3" />
            Tayyorlanmoqda
          </Badge>
        )
      case "ready":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <Check className="h-3 w-3" />
            Tayyor
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="flex h-screen flex-col bg-black text-white">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
        <h1 className="text-2xl font-bold">SmartResto - Buyurtmalar holati</h1>
        <div className="text-xl">{currentTime.toLocaleTimeString("uz-UZ")}</div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {orders.map((order) => (
            <Card key={order.id} className="bg-gray-900 border-gray-800 text-white overflow-hidden">
              <CardHeader className="bg-gray-800 pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">
                    {order.orderType === "dine-in"
                      ? order.table
                      : order.orderType === "delivery"
                        ? "Yetkazib berish"
                        : "Olib ketish"}
                  </CardTitle>
                  {getStatusBadge(order.status)}
                </div>
                <div className="text-sm text-gray-400">
                  {order.orderType !== "dine-in" && order.customer && <div>{order.customer.name}</div>}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getTimeDifference(order.timestamp)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="font-medium">{item.name}</div>
                      <Badge variant="outline" className="border-gray-700">
                        x{item.quantity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
