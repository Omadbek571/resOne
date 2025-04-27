"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CreditCard, DollarSign, LogOut, Printer, Receipt, ShoppingCart, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export default function CashierPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // API'dan buyurtmalarni olish
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          router.push("/auth")
          return
        }

        const response = await fetch("https://oshxona.pythonanywhere.com/api/v4/payments/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Buyurtmalarni yuklashda xatolik")
        }

        const data = await response.json()
        // API'dan kelgan ma'lumotlar "ready" statusli buyurtmalarni o'z ichiga oladi deb taxmin qilamiz
        setOrders(data.filter((order) => order.status === "ready" && !order.paid))
      } catch (err) {
        console.error("API xatolik:", err)
        setError("Buyurtmalarni yuklashda xatolik yuz berdi")
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [router])

  const formatTime = (date) => {
    const parsedDate = new Date(date)
    return parsedDate.toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateTotal = (order) => {
    if (!order || !order.items) return 0
    return order.items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const handleSelectOrder = (order) => {
    setSelectedOrder(order)
  }

  const handlePayment = () => {
    if (selectedOrder) {
      setShowPaymentDialog(true)
    }
  }

  const handleCompletePayment = async () => {
    if (!selectedOrder) return

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`https://oshxona.pythonanywhere.com/api/v4/payments/${selectedOrder.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paid: true,
          payment_method: paymentMethod,
          ...(paymentMethod === "cash" && {
            cash_received: Number.parseInt(cashReceived) || 0,
          }),
        }),
      })

      if (!response.ok) {
        throw new Error("To'lovni tasdiqlashda xatolik")
      }

      // Lokal holatni yangilash
      setOrders((prevOrders) =>
        prevOrders.map((order) => (order.id === selectedOrder.id ? { ...order, paid: true } : order)),
      )

      setShowPaymentDialog(false)
      setShowReceiptDialog(true)
    } catch (err) {
      console.error("To'lov xatolik:", err)
      alert("To'lovni tasdiqlashda xatolik yuz berdi")
    }
  }

  const handlePrintReceipt = () => {
    alert("Chek chop etilmoqda...")
    setShowReceiptDialog(false)

    if (selectedOrder && selectedOrder.orderType === "dine-in") {
      alert(`${selectedOrder.table} bo'shatildi!`)
    }

    if (selectedOrder) {
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== selectedOrder.id))
      setSelectedOrder(null)
    }
  }

  const calculateChange = () => {
    if (!cashReceived || !selectedOrder) return 0
    const change = Number.parseInt(cashReceived) - calculateTotal(selectedOrder)
    return change > 0 ? change : 0
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
          <Button variant="ghost" size="icon" onClick={() => router.push("/pos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Kassa</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/auth")}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Orders list */}
        <div className="w-1/3 border-r">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium">Tayyor buyurtmalar</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="p-4 space-y-4">
              {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                  <ShoppingCart className="mb-2 h-12 w-12" />
                  <h3 className="text-lg font-medium">Tayyor buyurtmalar yo'q</h3>
                </div>
              ) : (
                orders.map((order) => (
                  <Card
                    key={order.id}
                    className={`cursor-pointer hover:border-primary transition-colors ${
                      selectedOrder?.id === order.id ? "border-primary" : ""
                    }`}
                    onClick={() => handleSelectOrder(order)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          {order.orderType === "dine-in"
                            ? order.table
                            : order.orderType === "delivery"
                              ? "Yetkazib berish"
                              : "Olib ketish"}
                        </CardTitle>
                        <Badge variant="outline">#{order.id}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.orderType !== "dine-in" && order.customer && <div>{order.customer.name}</div>}
                        <div>{formatTime(order.timestamp)}</div>
                      </div>
                    </CardHeader>
                    <CardFooter className="p-4 pt-2 flex justify-between">
                      <div className="text-sm">{order.items.length} ta mahsulot</div>
                      <div className="font-medium">{calculateTotal(order).toLocaleString()} so'm</div>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right side - Order details */}
        <div className="flex-1 flex flex-col">
          {selectedOrder ? (
            <>
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">
                    {selectedOrder.orderType === "dine-in"
                      ? selectedOrder.table
                      : selectedOrder.orderType === "delivery"
                        ? "Yetkazib berish"
                        : "Olib ketish"}
                  </h2>
                  <Badge variant="outline">Buyurtma #{selectedOrder.id}</Badge>
                </div>
                {selectedOrder.orderType !== "dine-in" && selectedOrder.customer && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Mijoz: {selectedOrder.customer.name} - {selectedOrder.customer.phone}
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Buyurtma tafsilotlari</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{item.name}</div>
                              <Badge variant="secondary">x{item.quantity}</Badge>
                            </div>
                            <div className="text-right">
                              <div>{(item.price * item.quantity).toLocaleString()} so'm</div>
                              <div className="text-xs text-muted-foreground">
                                {item.price.toLocaleString()} so'm x {item.quantity}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Jami:</span>
                    <span>{calculateTotal(selectedOrder).toLocaleString()} so'm</span>
                  </div>
                </div>
                <Separator className="my-4" />
                <Button className="w-full" size="lg" onClick={handlePayment}>
                  To'lov qilish
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
              <Receipt className="mb-4 h-16 w-16" />
              <h3 className="text-xl font-medium">Buyurtma tanlang</h3>
              <p className="max-w-md mt-2">
                To'lov qilish va chek chiqarish uchun chap tomondagi ro'yxatdan buyurtmani tanlang
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment dialog */}
      {selectedOrder && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>To'lov</DialogTitle>
              <DialogDescription>To'lov usulini tanlang va to'lovni amalga oshiring</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Tabs defaultValue="cash" onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="cash" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Naqd
                  </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Karta
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Mobil
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="cash" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="total">Jami summa</Label>
                    <Input id="total" value={`${calculateTotal(selectedOrder).toLocaleString()} so'm`} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="received">Qabul qilingan summa</Label>
                    <Input
                      id="received"
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                    />
                  </div>
                  {cashReceived && (
                    <div className="grid gap-2">
                      <Label htmlFor="change">Qaytim</Label>
                      <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="card" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="card-total">Jami summa</Label>
                    <Input id="card-total" value={`${calculateTotal(selectedOrder).toLocaleString()} so'm`} readOnly />
                  </div>
                  <div className="text-center text-muted-foreground">
                    <p>Terminal orqali to'lovni amalga oshiring</p>
                  </div>
                </TabsContent>

                <TabsContent value="mobile" className="space-y-4 mt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mobile-total">Jami summa</Label>
                    <Input
                      id="mobile-total"
                      value={`${calculateTotal(selectedOrder).toLocaleString()} so'm`}
                      readOnly
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">Quyidagi to'lov tizimlaridan birini tanlang</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline">Payme</Button>
                      <Button variant="outline">Click</Button>
                      <Button variant="outline">Apelsin</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Bekor qilish
              </Button>
              <Button onClick={handleCompletePayment}>To'lovni yakunlash</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipt dialog */}
      {selectedOrder && (
        <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Chek</DialogTitle>
              <DialogDescription>To'lov muvaffaqiyatli amalga oshirildi</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Card className="border-dashed">
                <CardHeader className="text-center pb-2">
                  <CardTitle>SmartResto</CardTitle>
                  <p className="text-sm text-muted-foreground">Toshkent sh., Chilonzor tumani</p>
                  <p className="text-sm text-muted-foreground">Tel: +998 71 123 45 67</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center text-sm">
                    <p>Chek: #{selectedOrder.id}</p>
                    <p>
                      {new Date().toLocaleDateString("uz-UZ")} {formatTime(new Date())}
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <div>
                          {item.name} x{item.quantity}
                        </div>
                        <div>{(item.price * item.quantity).toLocaleString()} so'm</div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <div>Jami:</div>
                    <div>{calculateTotal(selectedOrder).toLocaleString()} so'm</div>
                  </div>
                  <div className="text-center text-xs text-muted-foreground pt-4">
                    <p>Xaridingiz uchun rahmat!</p>
                    <p>Yana tashrif buyuring!</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handlePrintReceipt}>
                <Printer className="mr-2 h-4 w-4" />
                Chekni chop etish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
