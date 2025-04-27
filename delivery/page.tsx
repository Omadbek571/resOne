"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Check, Clock, LogOut, MapPin, Phone, Truck, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Mock data for delivery orders
const mockOrders = [
  {
    id: 1,
    customer: {
      name: "Dilshod Rahimov",
      phone: "+998 90 987 65 43",
      address: "Toshkent sh., Chilonzor tumani, 19-kvartal, 5-uy",
    },
    items: [
      { id: 1, name: "Shashlik", quantity: 4, price: 45000 },
      { id: 2, name: "Qo'y sho'rva", quantity: 1, price: 40000 },
      { id: 3, name: "Non", quantity: 2, price: 5000 },
    ],
    total: 235000,
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    status: "ready",
    paymentMethod: "cash",
    isPaid: false,
  },
  {
    id: 2,
    customer: {
      name: "Aziza Karimova",
      phone: "+998 90 123 45 67",
      address: "Toshkent sh., Yunusobod tumani, 4-kvartal, 10-uy, 42-xonadon",
    },
    items: [
      { id: 1, name: "Osh", quantity: 2, price: 35000 },
      { id: 2, name: "Salat", quantity: 1, price: 25000 },
      { id: 3, name: "Coca-Cola", quantity: 2, price: 12000 },
    ],
    total: 119000,
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    status: "ready",
    paymentMethod: "card",
    isPaid: true,
  },
  {
    id: 3,
    customer: {
      name: "Jahongir Umarov",
      phone: "+998 90 345 67 89",
      address: "Toshkent sh., Mirzo Ulug'bek tumani, Feruza ko'chasi, 15-uy",
    },
    items: [
      { id: 1, name: "Lag'mon", quantity: 3, price: 30000 },
      { id: 2, name: "Manti", quantity: 10, price: 5000 },
      { id: 3, name: "Choy", quantity: 1, price: 5000 },
    ],
    total: 145000,
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    status: "delivering",
    paymentMethod: "cash",
    isPaid: false,
  },
  {
    id: 4,
    customer: {
      name: "Nodira Azizova",
      phone: "+998 90 567 89 01",
      address: "Toshkent sh., Sergeli tumani, Yangi Sergeli ko'chasi, 7-uy",
    },
    items: [
      { id: 1, name: "Burger", quantity: 2, price: 32000 },
      { id: 2, name: "Lavash", quantity: 1, price: 28000 },
      { id: 3, name: "Pepsi", quantity: 2, price: 12000 },
    ],
    total: 116000,
    timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
    status: "delivered",
    paymentMethod: "mobile",
    isPaid: true,
  },
]

export default function DeliveryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("ready")
  const [orders, setOrders] = useState(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false)
  const [showDeliveryCompleteDialog, setShowDeliveryCompleteDialog] = useState(false)
  const [deliveryNote, setDeliveryNote] = useState("")
  const [cashReceived, setCashReceived] = useState("")

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "ready") return order.status === "ready"
    if (activeTab === "delivering") return order.status === "delivering"
    if (activeTab === "delivered") return order.status === "delivered"
    return true
  })

  const handleStartDelivery = (orderId: number) => {
    setOrders(orders.map((order) => (order.id === orderId ? { ...order, status: "delivering" } : order)))
  }

  const handleCompleteDelivery = (orderId: number) => {
    // If payment is not made yet and it's cash payment, show payment dialog
    const order = orders.find((o) => o.id === orderId)
    if (order && !order.isPaid && order.paymentMethod === "cash") {
      setSelectedOrder(order)
      setShowDeliveryCompleteDialog(true)
    } else {
      // If already paid or not cash payment, just mark as delivered
      setOrders(orders.map((order) => (order.id === orderId ? { ...order, status: "delivered" } : order)))
    }
  }

  const handleFinalizeDelivery = () => {
    if (selectedOrder) {
      setOrders(
        orders.map((order) =>
          order.id === selectedOrder.id ? { ...order, status: "delivered", isPaid: true } : order,
        ),
      )
      setShowDeliveryCompleteDialog(false)
      setSelectedOrder(null)
      setDeliveryNote("")
      setCashReceived("")
    }
  }

  const handleViewOrderDetails = (order: any) => {
    setSelectedOrder(order)
    setShowOrderDetailsDialog(true)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
  }

  const getTimeDifference = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60)
    return `${diff} daqiqa`
  }

  const calculateChange = () => {
    if (!cashReceived || !selectedOrder) return 0
    const change = Number.parseInt(cashReceived) - selectedOrder.total
    return change > 0 ? change : 0
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "cash":
        return "Naqd pul"
      case "card":
        return "Karta"
      case "mobile":
        return "Mobil to'lov"
      default:
        return method
    }
  }

  const handleLogout = () => {
    router.push("/auth")
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/auth")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Yetkazib berish</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>SM</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium">Sardor Mahmudov</p>
              <p className="text-xs text-muted-foreground">Yetkazib beruvchi</p>
            </div>
          </div>
          <Button variant="outline" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-4">
        <Tabs defaultValue="ready" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-4">
            <TabsTrigger value="ready">Tayyor</TabsTrigger>
            <TabsTrigger value="delivering">Yetkazilmoqda</TabsTrigger>
            <TabsTrigger value="delivered">Yetkazildi</TabsTrigger>
          </TabsList>

          <TabsContent value="ready" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                  <Truck className="mb-2 h-12 w-12" />
                  <h3 className="text-lg font-medium">Tayyor buyurtmalar yo'q</h3>
                  <p className="text-sm">Hozirda yetkazish uchun tayyor buyurtmalar mavjud emas</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Buyurtma #{order.id}</CardTitle>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeDifference(order.timestamp)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.customer.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer.phone}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Mahsulotlar:</span>
                          <span className="text-sm font-medium">{order.items.length} ta</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Jami summa:</span>
                          <span className="text-sm font-medium">{order.total.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">To'lov usuli:</span>
                          <span className="text-sm font-medium">{getPaymentMethodText(order.paymentMethod)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">To'lov holati:</span>
                          <Badge
                            variant={order.isPaid ? "success" : "outline"}
                            className={order.isPaid ? "bg-green-100 text-green-800" : ""}
                          >
                            {order.isPaid ? "To'langan" : "To'lanmagan"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 border-t p-2">
                      <Button variant="outline" className="w-full" onClick={() => handleViewOrderDetails(order)}>
                        Batafsil
                      </Button>
                      <Button variant="default" className="w-full" onClick={() => handleStartDelivery(order.id)}>
                        Yetkazishni boshlash
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="delivering" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                  <Truck className="mb-2 h-12 w-12" />
                  <h3 className="text-lg font-medium">Yetkazilayotgan buyurtmalar yo'q</h3>
                  <p className="text-sm">Hozirda yetkazilayotgan buyurtmalar mavjud emas</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Buyurtma #{order.id}</CardTitle>
                        <Badge variant="outline" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
                          <Truck className="h-3 w-3" />
                          Yetkazilmoqda
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.customer.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer.phone}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{order.customer.address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Jami summa:</span>
                          <span className="text-sm font-medium">{order.total.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">To'lov usuli:</span>
                          <span className="text-sm font-medium">{getPaymentMethodText(order.paymentMethod)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">To'lov holati:</span>
                          <Badge
                            variant={order.isPaid ? "success" : "outline"}
                            className={order.isPaid ? "bg-green-100 text-green-800" : ""}
                          >
                            {order.isPaid ? "To'langan" : "To'lanmagan"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 border-t p-2">
                      <Button variant="outline" className="w-full" onClick={() => handleViewOrderDetails(order)}>
                        Batafsil
                      </Button>
                      <Button variant="default" className="w-full" onClick={() => handleCompleteDelivery(order.id)}>
                        Yetkazildi
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="delivered" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                  <Truck className="mb-2 h-12 w-12" />
                  <h3 className="text-lg font-medium">Yetkazilgan buyurtmalar yo'q</h3>
                  <p className="text-sm">Hozirda yetkazilgan buyurtmalar mavjud emas</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Buyurtma #{order.id}</CardTitle>
                        <Badge variant="success" className="flex items-center gap-1 bg-green-100 text-green-800">
                          <Check className="h-3 w-3" />
                          Yetkazildi
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.customer.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(order.timestamp)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-1">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{order.customer.address}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Jami summa:</span>
                          <span className="text-sm font-medium">{order.total.toLocaleString()} so'm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">To'lov usuli:</span>
                          <span className="text-sm font-medium">{getPaymentMethodText(order.paymentMethod)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-2">
                      <Button variant="outline" className="w-full" onClick={() => handleViewOrderDetails(order)}>
                        Batafsil
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Buyurtma #{selectedOrder.id} tafsilotlari</DialogTitle>
              <DialogDescription>{formatTime(selectedOrder.timestamp)} da qabul qilingan</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Mijoz ma'lumotlari</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.customer.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{selectedOrder.customer.address}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Buyurtma tarkibi</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        {item.name} x{item.quantity}
                      </div>
                      <div>{(item.price * item.quantity).toLocaleString()} so'm</div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <div>Jami:</div>
                    <div>{selectedOrder.total.toLocaleString()} so'm</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">To'lov ma'lumotlari</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>To'lov usuli:</span>
                    <span>{getPaymentMethodText(selectedOrder.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>To'lov holati:</span>
                    <Badge
                      variant={selectedOrder.isPaid ? "success" : "outline"}
                      className={selectedOrder.isPaid ? "bg-green-100 text-green-800" : ""}
                    >
                      {selectedOrder.isPaid ? "To'langan" : "To'lanmagan"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowOrderDetailsDialog(false)}>Yopish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delivery Complete Dialog */}
      {selectedOrder && (
        <Dialog open={showDeliveryCompleteDialog} onOpenChange={setShowDeliveryCompleteDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Yetkazib berishni yakunlash</DialogTitle>
              <DialogDescription>
                Buyurtma #{selectedOrder.id} yetkazib berildi. To'lovni qabul qiling.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="total">Jami summa</Label>
                <Input id="total" value={`${selectedOrder.total.toLocaleString()} so'm`} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="received">Qabul qilingan summa</Label>
                <Input
                  id="received"
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
              </div>
              {cashReceived && (
                <div className="space-y-2">
                  <Label htmlFor="change">Qaytim</Label>
                  <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="note">Izoh (ixtiyoriy)</Label>
                <Textarea
                  id="note"
                  placeholder="Yetkazib berish haqida izoh qoldiring..."
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeliveryCompleteDialog(false)}>
                Bekor qilish
              </Button>
              <Button
                onClick={handleFinalizeDelivery}
                disabled={!cashReceived || Number.parseInt(cashReceived) < selectedOrder.total}
              >
                Yakunlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
