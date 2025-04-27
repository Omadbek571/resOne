"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  LogOut,
  Printer,
  Receipt,
  ShoppingCart,
  Smartphone,
  X, // Import qilingan ikonka
  Loader2, // Yuklanish uchun
  AlertTriangle, // Xatolik uchun
  RotateCcw, // Qayta urinish uchun
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose // Footer dagi tugma uchun kerak
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function CashierPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [paymentHistory, setPaymentHistory] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null) // Bu hali ham to'lov va asosiy ko'rinish uchun kerak
  const [viewingOrderDetails, setViewingOrderDetails] = useState(null) // Tarix uchun
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [selectedMobileProvider, setSelectedMobileProvider] = useState("")
  const [showReceiptDialog, setShowReceiptDialog] = useState(false) // Chek dialogini ko'rsatish/yashirish
  const [showDetailsDialog, setShowDetailsDialog] = useState(false) // Tarix tafsilotlari dialogi
  const [isLoading, setIsLoading] = useState(true) // Sahifa yuklanishi
  const [errorOrders, setErrorOrders] = useState("")
  const [errorHistory, setErrorHistory] = useState("")
  const [paymentError, setPaymentError] = useState("")

  // === YANGI STATE'LAR (CHEK UCHUN) ===
  const [receiptData, setReceiptData] = useState(null) // API dan kelgan chek ma'lumotlari
  const [isReceiptLoading, setIsReceiptLoading] = useState(false) // Chek yuklanish holati
  const [receiptError, setReceiptError] = useState(null) // Chek yuklash xatosi
  const [receiptOrderId, setReceiptOrderId] = useState(null); // Qaysi buyurtma uchun chek yuklanayotganini bilish

  // Token olish funksiyasi
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token")
    }
    return null
  }

  // Ma'lumotlarni yuklash effekti
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    const token = getToken()
    if (!token) {
      router.replace("/auth")
      toast.error("Sessiya topilmadi. Iltimos, qayta kiring.")
      setIsLoading(false)
      return
    }

    // API so'rovlari
    const fetchOrders = axios.get(
      "https://oshxonacopy.pythonanywhere.com/api/cashier/orders-ready/",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    )
    const fetchHistory = axios.get(
      "https://oshxonacopy.pythonanywhere.com/api/cashier/payment-history/",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    )

    // Barcha so'rovlarni bajarish
    Promise.all([fetchOrders, fetchHistory])
      .then(([ordersRes, historyRes]) => {
        if (isMounted) {
          console.log("Tayyor buyurtmalar API javobi:", ordersRes.data)
          setOrders(ordersRes.data || [])
          if (ordersRes.data?.length === 0 && !errorOrders) {
            // Toast.info() olib tashlandi, keraksiz bo'lishi mumkin
          }

          console.log("To'langan buyurtmalar tarixi API javobi:", historyRes.data)
          const sortedHistory = (historyRes.data || []).sort(
            (a, b) =>
              new Date(b.payment?.timestamp || b.updated_at) -
              new Date(a.payment?.timestamp || a.updated_at)
          )
          setPaymentHistory(sortedHistory)
          if (historyRes.data?.length === 0 && !errorHistory) {
            // Toast.info() olib tashlandi
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Ma'lumotlarni yuklashda xato:", err)
          if (err.response?.status === 401) {
            toast.error("Sessiya muddati tugagan yoki yaroqsiz. Iltimos, qayta kiring.")
            localStorage.removeItem("token")
            router.replace("/auth")
          } else {
            let ordersErrorSet = false,
              historyErrorSet = false
            if (err.config?.url?.includes("orders-ready")) {
              setErrorOrders("Tayyor buyurtmalarni yuklashda xato.")
              ordersErrorSet = true
            }
            if (err.config?.url?.includes("payment-history")) {
              setErrorHistory("To'lov tarixini yuklashda xato.")
              historyErrorSet = true
            }
            if (!ordersErrorSet && !historyErrorSet) {
              setErrorOrders("Tayyor buyurtmalarni yuklashda xato.")
              setErrorHistory("To'lov tarixini yuklashda xato.")
            }
            toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi.")
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [router])

  // Vaqtni formatlash (Agar API dan formatlangan kelmasa, kerak bo'lishi mumkin)
  const formatTime = (dateString) => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        console.warn("Noto'g'ri sana formati:", dateString)
        return "Noto'g'ri sana"
      }
      // Endi to'liq sana va vaqtni ko'rsatamiz
      return date.toLocaleString("uz-UZ", {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch (e) {
      console.error("Sana formatlashda xato:", e, "Sana:", dateString)
      return "Xatolik"
    }
  }

  // Funksiyalar
  const handleSelectOrderForPayment = (order) => {
    if (!order) return
    setSelectedOrder(order)
    // To'lov dialogiga aloqador state'larni tozalash
    setShowPaymentDialog(false)
    setPaymentMethod("cash")
    setCashReceived("")
    setSelectedMobileProvider("")
    setPaymentError("")
    // Chek dialogiga aloqador state'larni ham tozalash (agar oldingisidan qolgan bo'lsa)
    setShowReceiptDialog(false);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptOrderId(null);
  }

  const handleViewHistoryDetails = (order) => {
    if (!order) return
    setViewingOrderDetails(order)
    setShowDetailsDialog(true)
    // Chek state'larini tozalash
    setShowReceiptDialog(false);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptOrderId(null);
  }

  const handlePayment = () => {
    if (selectedOrder && !selectedOrder.payment) { // Faqat to'lanmaganlar uchun
      setPaymentError("")
      setPaymentMethod("cash")
      setCashReceived("")
      setSelectedMobileProvider("")
      setShowPaymentDialog(true)
    } else if (selectedOrder && selectedOrder.payment) {
        toast.info(`Buyurtma #${selectedOrder.id} allaqachon to'langan.`)
        // Agar to'langan bo'lsa, chekni ko'rsatishni taklif qilish mumkin
        fetchReceiptData(selectedOrder.id);
    } else {
      toast.warn("Iltimos, avval to'lov uchun buyurtmani tanlang")
    }
  }

  // === YANGI FUNKSIYA: Chek Ma'lumotlarini Yuklash ===
  const fetchReceiptData = async (orderId) => {
    if (!orderId) {
      console.error("Chek yuklash uchun orderId kerak!");
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!");
      setReceiptError("Avtorizatsiya xatosi.");
      return;
    }

    // Agar shu ID uchun yuklanayotgan bo'lsa, qayta yuklamaslik
    if (isReceiptLoading && receiptOrderId === orderId) {
        return;
    }

    console.log(`Buyurtma #${orderId} uchun chek ma'lumotlari yuklanmoqda...`);
    setIsReceiptLoading(true);
    setReceiptError(null);
    setReceiptData(null); // Eski ma'lumotni tozalash
    setReceiptOrderId(orderId); // Qaysi ID yuklanayotganini belgilash
    setShowReceiptDialog(true); // Dialog oynani ochish (yuklanish holatini ko'rsatish uchun)

    try {
      const response = await axios.get(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/receipt/`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log("Chek API javobi:", response.data);
      if (response.data) {
        setReceiptData(response.data); // Ma'lumotlarni state'ga saqlash
      } else {
        throw new Error("API dan bo'sh javob qaytdi");
      }
      setReceiptError(null); // Xatolik yo'q
    } catch (err) {
      console.error(`Buyurtma #${orderId} uchun chek yuklash xatosi:`, err);
      let errorMsg = `Buyurtma #${orderId} uchun chek yuklashda xatolik yuz berdi.`;
      if (err.response) {
        const { status, data } = err.response;
        if (status === 404) {
          errorMsg = `Buyurtma #${orderId} topilmadi, to'lanmagan yoki chek ma'lumotlari mavjud emas.`;
        } else if (status === 401) {
          errorMsg = "Avtorizatsiya xatosi. Token yaroqsiz.";
        } else if (status === 403) {
          errorMsg = "Chekni ko'rish uchun ruxsatingiz yo'q.";
        } else if (data?.detail) {
          errorMsg = data.detail;
        } else {
          errorMsg = `Server xatosi (${status}): ${JSON.stringify(data)}`;
        }
      } else {
        errorMsg = `Tarmoq xatosi: ${err.message}`;
      }
      setReceiptError(errorMsg); // Xatolikni state'ga saqlash
      setReceiptData(null); // Ma'lumot yo'q
      toast.error(errorMsg, { autoClose: 5000 });
    } finally {
      setIsReceiptLoading(false); // Yuklash tugadi
    }
  };


  // To'lovni yakunlash
  const handleCompletePayment = async () => {
    if (!selectedOrder) {
      toast.error("Buyurtma tanlanmagan!")
      return
    }
    setPaymentError("")
    const token = getToken()
    if (!token) {
      setPaymentError("Avtorizatsiya xatosi. Iltimos, qayta kiring.")
      toast.error("Avtorizatsiya tokeni topilmadi!")
      return
    }
    if (!paymentMethod || !["cash", "card", "mobile"].includes(paymentMethod)) {
      const errorMsg = "Iltimos, to'g'ri to'lov usulini tanlang."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }
    if (paymentMethod === "mobile" && !selectedMobileProvider) {
      const errorMsg = "Mobil to'lov uchun provayderni tanlang (Payme, Click, Apelsin)."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }
    const finalPrice = parseFloat(selectedOrder.final_price || 0)
    const received = parseFloat(cashReceived)
    if (paymentMethod === "cash" && (isNaN(received) || received <= 0)) {
      const errorMsg = "Iltimos, qabul qilingan naqd summani kiriting."
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }
    if (paymentMethod === "cash" && received < finalPrice) {
      const errorMsg = `Qabul qilingan summa (${received.toLocaleString()} so'm) jami summadan (${finalPrice.toLocaleString()} so'm) kam bo'lishi mumkin emas.`
      setPaymentError(errorMsg)
      toast.error(errorMsg)
      return
    }
    const paymentData = {
      method: paymentMethod,
      ...(paymentMethod === "cash" && { received_amount: received }),
      ...(paymentMethod === "mobile" && { mobile_provider: selectedMobileProvider }),
    }
    toast
      .promise(
        axios.post(
          `https://oshxonacopy.pythonanywhere.com/api/orders/${selectedOrder.id}/process_payment/`,
          paymentData,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        ),
        {
          pending: "To'lov amalga oshirilmoqda...",
          success: `Buyurtma #${selectedOrder.id} to'lovi muvaffaqiyatli!`,
          error: {
            render({ data }) {
              console.error("To'lov API xatosi:", data)
              let msg = "To'lovda noma'lum xatolik."
              if (data?.response?.data?.detail) {
                msg = data.response.data.detail
              } else if (data?.response?.data && typeof data.response.data === "object") {
                msg =
                  Object.entries(data.response.data)
                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
                    .join("; ") || msg
              } else if (data?.response?.status) {
                msg = `Server xatosi (${data.response.status})`
              } else if (data?.message) {
                msg = data.message
              }
              setPaymentError(msg)
              return `Xatolik: ${msg}`
            },
          },
        }
      )
      .then((response) => {
        console.log("To'lov muvaffaqiyatli:", response.data)
        const paidOrder = { ...selectedOrder, payment: response.data } // To'lov ma'lumotini qo'shish
        // Ro'yxatlarni yangilash
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== selectedOrder.id))
        setPaymentHistory((prevHistory) =>
          [paidOrder, ...prevHistory].sort(
            (a, b) =>
              new Date(b.payment?.timestamp || b.updated_at) -
              new Date(a.payment?.timestamp || a.updated_at)
          )
        )
        setShowPaymentDialog(false) // To'lov dialogini yopish
        // === CHEK MA'LUMOTLARINI YUKLASH ===
        fetchReceiptData(paidOrder.id)
      })
      .catch((err) => {
        // Xatolik toast.promise orqali ko'rsatiladi
        console.error("To'lov catch bloki (qo'shimcha log):", err)
      })
  }

  // Chekni chop etish va yopish
  const handlePrintAndCloseReceipt = () => {
    if (!receiptData) {
      toast.error("Chop etish uchun chek ma'lumotlari topilmadi.")
      return;
    }
    const orderId = receiptOrderId; // Qaysi buyurtma IDsi ekanligini bilamiz
    console.log(`Buyurtma #${orderId} uchun chek chop etish simulyatsiyasi`)
    toast.info(`Buyurtma #${orderId} uchun chek chop etildi (simulyatsiya).`)
    // window.print(); // Haqiqiy print funksiyasi

    // Dialog va state'larni tozalash
    setShowReceiptDialog(false);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptOrderId(null);
    setSelectedOrder(null); // Asosiy tanlangan buyurtmani ham tozalash
    // Keraksiz state'larni tozalash
    setCashReceived("")
    setSelectedMobileProvider("")
    setPaymentMethod("cash")

    // Agar dine_in bo'lsa, stol haqida xabar
    // `selectedOrder` null bo'lishi mumkin, shuning uchun `paymentHistory` dan topishga harakat qilamiz
    const justPaidOrder = paymentHistory.find(o => o.id === orderId);
    if (justPaidOrder?.order_type === "dine_in") {
      toast.info(`Stol ${justPaidOrder.table?.name || justPaidOrder.table_id || ""} endi bo'sh`, {
        autoClose: 4000,
      });
    }
  }

  // Qaytimni hisoblash
  const calculateChange = () => {
    if (paymentMethod !== "cash" || !cashReceived || !selectedOrder?.final_price) return 0
    const received = parseFloat(cashReceived)
    const price = parseFloat(selectedOrder.final_price)
    if (isNaN(received) || isNaN(price) || received < price) return 0
    return received - price
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <span>Ma'lumotlar yuklanmoqda...</span>
        </div>
      </div>
    )
  }

  // Asosiy UI Render
  return (
    <div className="flex h-screen flex-col bg-muted/40">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Ortga (POS)"
            onClick={() => router.push("/pos")}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Ortga (POS)</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">Kassa</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => {
              localStorage.removeItem("token")
              router.replace("/auth")
              toast.info("Tizimdan muvaffaqiyatli chiqildi")
            }}
            title="Chiqish"
          >
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Chiqish</span>
          </Button>
        </div>
      </header>

      {/* Asosiy Kontent */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden">
        {/* Chap ustun: Buyurtmalar ro'yxati */}
        <div className="md:col-span-1 border-r border-border flex flex-col overflow-hidden bg-background">
          <Tabs defaultValue="ready-orders" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 shrink-0 h-11 border-b bg-background z-10">
              <TabsTrigger value="ready-orders" className="text-xs sm:text-sm">
                Tayyor
              </TabsTrigger>
              <TabsTrigger value="payment-history" className="text-xs sm:text-sm">
                Tarix
              </TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-hidden">
              {/* Tayyor buyurtmalar */}
              <TabsContent value="ready-orders" className="h-full overflow-hidden mt-0 p-0">
                <ScrollArea className="h-full p-2 sm:p-4">
                  {errorOrders ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                      <p className="mb-2">{errorOrders}</p>
                      <Button size="sm" onClick={() => window.location.reload()}>
                        Qayta yuklash
                      </Button>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                      <ShoppingCart className="mb-3 h-12 w-12 text-gray-400" />
                      <h3 className="text-base sm:text-lg font-medium">Tayyor buyurtmalar yo'q</h3>
                      <p className="text-xs sm:text-sm mt-1">Yangi buyurtmalar bu yerda ko'rinadi.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <Card
                          key={`ready-${order.id}`}
                          className={`cursor-pointer hover:shadow-md transition-all rounded-lg border ${
                            selectedOrder?.id === order.id && !selectedOrder.payment
                              ? "border-primary ring-2 ring-primary ring-offset-2"
                              : "border-border hover:border-muted-foreground/50"
                          }`}
                          onClick={() => handleSelectOrderForPayment(order)}
                        >
                          <CardHeader className="p-3 sm:p-4 pb-2">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                                {order.order_type_display || "Noma'lum"}
                                {order.order_type === "dine_in" &&
                                  ` - ${order.table?.name ? `Stol ${order.table.name}` : "Stol"}`}
                              </CardTitle>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 whitespace-nowrap">
                                #{order.id}
                              </Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                              {order.customer_name && (
                                <p className="truncate" title={order.customer_name}>
                                  {order.customer_name}
                                </p>
                              )}
                              {/* Vaqtni to'liq ko'rsatish */}
                              <p>Yaratildi: {formatTime(order.created_at)}</p>
                            </div>
                          </CardHeader>
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="flex items-center space-x-1 px-3 pt-0 pb-2 overflow-x-auto">
                              {order.items.slice(0, 5).map((item) => (
                                <img
                                  key={item.id || `img-${item.product}`}
                                  src={item.product_details?.image_url || "/placeholder-product.jpg"}
                                  alt={item.product_details?.name || ""}
                                  className="h-8 w-8 rounded-md object-cover border flex-shrink-0"
                                  title={item.product_details?.name || ""}
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder-product.jpg"
                                  }}
                                  loading="lazy"
                                />
                              ))}
                              {order.items.length > 5 && (
                                <div className="h-8 w-8 rounded-md border bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  +{order.items.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                          <CardFooter className="p-3 sm:p-4 pt-1 sm:pt-2 flex justify-between items-center">
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {Array.isArray(order.items) ? `${order.items.length} mahsulot` : "0 mahsulot"}
                            </div>
                            <div className="font-semibold text-sm sm:text-base">
                              {parseFloat(order.final_price || 0).toLocaleString()} so'm
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              {/* To'lov tarixi */}
              <TabsContent value="payment-history" className="h-full overflow-hidden mt-0 p-0">
                <ScrollArea className="h-full p-2 sm:p-4">
                  {errorHistory ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                      <p className="mb-2">{errorHistory}</p>
                      <Button size="sm" onClick={() => window.location.reload()}>
                        Qayta yuklash
                      </Button>
                    </div>
                  ) : paymentHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                      <Receipt className="mb-3 h-12 w-12 text-gray-400" />
                      <h3 className="text-base sm:text-lg font-medium">To'lov tarixi bo'sh</h3>
                      <p className="text-xs sm:text-sm mt-1">Yakunlangan to'lovlar bu yerda ko'rinadi.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory.map((order) => (
                        <Card
                          key={`history-${order.id}`}
                          className="hover:shadow-md transition-colors rounded-lg border border-border hover:border-muted-foreground/50 cursor-pointer"
                          onClick={() => handleViewHistoryDetails(order)}
                        >
                          <CardHeader className="p-3 sm:p-4 pb-2">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                                {order.order_type_display || "Noma'lum"}
                                {order.order_type === "dine_in" &&
                                  ` - ${order.table?.name ? `Stol ${order.table.name}` : "Stol"}`}
                              </CardTitle>
                              <Badge variant="success" className="text-xs px-1.5 py-0.5 whitespace-nowrap">
                                #{order.id} (To'langan)
                              </Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                              {order.customer_name && (
                                <p className="truncate" title={order.customer_name}>
                                  {order.customer_name}
                                </p>
                              )}
                              {/* Vaqtni to'liq ko'rsatish */}
                              <p>To'landi: {formatTime(order.payment?.timestamp || order.updated_at)}</p>
                              <p>
                                Usul: <span className="capitalize">{order.payment?.method_display || order.payment?.method || "N/A"}</span>
                              </p>
                            </div>
                          </CardHeader>
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="flex items-center space-x-1 px-3 pt-0 pb-2 overflow-x-auto">
                              {order.items.slice(0, 5).map((item) => (
                                <img
                                  key={item.id || `hist-img-${item.product}`}
                                  src={item.product_details?.image_url || "/placeholder-product.jpg"}
                                  alt={item.product_details?.name || ""}
                                  className="h-8 w-8 rounded-md object-cover border flex-shrink-0"
                                  title={item.product_details?.name || ""}
                                  onError={(e) => {
                                    e.currentTarget.src = "/placeholder-product.jpg"
                                  }}
                                  loading="lazy"
                                />
                              ))}
                              {order.items.length > 5 && (
                                <div className="h-8 w-8 rounded-md border bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  +{order.items.length - 5}
                                </div>
                              )}
                            </div>
                          )}
                          <CardFooter className="p-3 sm:p-4 pt-1 sm:pt-2 flex justify-between items-center">
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {Array.isArray(order.items) ? `${order.items.length} mahsulot` : "0 mahsulot"}
                            </div>
                            <div className="font-semibold text-sm sm:text-base">
                              {parseFloat(order.final_price || 0).toLocaleString()} so'm
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* O'ng ustun: Tanlangan buyurtma */}
        <div className="md:col-span-2 flex flex-col overflow-hidden bg-background">
          {selectedOrder ? (
            <>
              <div className="p-4 border-b border-border shrink-0 h-16 flex justify-between items-center gap-4">
                <h2 className="text-base sm:text-lg font-semibold truncate">
                  {selectedOrder.order_type_display || "Buyurtma"}
                </h2>
                <div className="flex items-center gap-2">
                  {selectedOrder.order_type === "dine_in" && (
                    <Badge variant="outline" className="whitespace-nowrap">
                      Stol {selectedOrder.table?.name || selectedOrder.table_id || "?"}
                    </Badge>
                  )}
                  <Badge variant="outline" className="whitespace-nowrap">
                    ID: #{selectedOrder.id}
                  </Badge>
                  {selectedOrder.payment && (
                    <Badge variant="success" className="whitespace-nowrap">
                      To'langan
                    </Badge>
                  )}
                </div>
              </div>
              {selectedOrder.customer_name && (
                <div className="px-4 pt-2 pb-1 border-b border-border shrink-0 text-xs sm:text-sm text-muted-foreground">
                  <span>Mijoz: {selectedOrder.customer_name}</span>
                  {selectedOrder.customer_phone && <span> - {selectedOrder.customer_phone}</span>}
                </div>
              )}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <div
                        key={item.id || `item-${item.product}`}
                        className="flex justify-between items-center gap-2 border-b border-border pb-3 last:border-0"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-md overflow-hidden bg-muted">
                            <img
                              src={item.product_details?.image_url || "/placeholder-product.jpg"}
                              alt={item.product_details?.name || "Mahsulot"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-product.jpg"
                              }}
                            />
                          </div>
                          <div className="flex-grow min-w-0">
                            <p
                              className="font-medium text-sm sm:text-base truncate"
                              title={item.product_details?.name || "Noma'lum"}
                            >
                              {item.product_details?.name || "Noma'lum mahsulot"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(item.unit_price || 0).toLocaleString()} so'm
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            x{item.quantity || 0}
                          </Badge>
                        </div>
                        <div className="text-right font-semibold text-sm sm:text-base w-24 shrink-0">
                          {parseFloat(item.total_price || 0).toLocaleString()} so'm
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      Buyurtma elementlari topilmadi.
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t border-border p-4 shrink-0 bg-muted/20">
                <div className="space-y-1 mb-4 text-sm sm:text-base">
                  {/* Subtotal API dan kelmasa, hisoblash mumkin */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Mahsulotlar jami:</span>
                      <span>{selectedOrder.items?.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0).toLocaleString()} so'm</span>
                  </div>
                  {Number(selectedOrder.service_fee_amount || 0) > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Xizmat haqi ({selectedOrder.service_fee_percent || 0}%):</span>
                      <span>+ {parseFloat(selectedOrder.service_fee_amount).toLocaleString()} so'm</span>
                    </div>
                  )}
                  {Number(selectedOrder.tax_amount || 0) > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Soliq ({selectedOrder.tax_percent || 0}%):</span>
                      <span>+ {parseFloat(selectedOrder.tax_amount).toLocaleString()} so'm</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-1">
                    <span>Jami to'lov:</span>
                    <span>{parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm</span>
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                  onClick={handlePayment}
                  disabled={!!selectedOrder.payment} // Agar payment mavjud bo'lsa, bloklash
                >
                  {selectedOrder.payment ? "TO'LANGAN" : "To'lov Qilish"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
              <Receipt className="mb-4 h-16 w-16 text-gray-400" />
              <h3 className="text-xl font-semibold">Buyurtma Tanlanmagan</h3>
              <p className="max-w-xs mt-2 text-sm">
                Tafsilotlarni ko'rish va to'lov qilish uchun chap tomondagi ro'yxatdan buyurtmani
                tanlang.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* === MODALLAR === */}
      {/* To'lov Dialogi (O'zgarishsiz) */}
      {selectedOrder && !selectedOrder.payment && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>To'lov (Buyurtma #{selectedOrder.id})</DialogTitle>
              <DialogDescription>To'lov usulini tanlang va ma'lumotlarni kiriting.</DialogDescription>
            </DialogHeader>
            {paymentError && (
              <div className="bg-destructive/10 border border-destructive text-destructive text-sm rounded-md p-3 my-3 text-center break-words">
                {paymentError}
              </div>
            )}
            <div className="py-4">
              <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                <TabsList className="grid w-full grid-cols-3 h-11">
                  <TabsTrigger value="cash" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"> <DollarSign className="h-4 w-4" /> Naqd </TabsTrigger>
                  <TabsTrigger value="card" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"> <CreditCard className="h-4 w-4" /> Karta </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"> <Smartphone className="h-4 w-4" /> Mobil </TabsTrigger>
                </TabsList>
                <TabsContent value="cash" className="mt-4 space-y-4">
                  <div className="space-y-1"> <Label htmlFor="payment-total-cash" className="text-xs text-muted-foreground">Jami summa</Label> <Input id="payment-total-cash" value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50"/> </div>
                  <div className="space-y-1"> <Label htmlFor="received">Qabul qilingan summa*</Label> <Input id="received" type="number" placeholder="Summani kiriting" value={cashReceived} onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))} className="h-11 text-base" min="0" step="any" required /> </div>
                  {parseFloat(cashReceived) >= parseFloat(selectedOrder.final_price || 0) && ( <div className="space-y-1"> <Label htmlFor="change" className="text-xs text-muted-foreground">Qaytim</Label> <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50"/> </div> )}
                </TabsContent>
                <TabsContent value="card" className="mt-4 space-y-4">
                  <div className="space-y-1"> <Label htmlFor="payment-total-card" className="text-xs text-muted-foreground">Jami summa</Label> <Input id="payment-total-card" value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50"/> </div>
                  <div className="text-center text-muted-foreground p-4 border rounded-md bg-muted/50"> <CreditCard className="mx-auto h-8 w-8 mb-2 text-primary" /> <p className="text-sm">Iltimos, to'lovni POS terminal orqali amalga oshiring.</p> </div>
                </TabsContent>
                <TabsContent value="mobile" className="mt-4 space-y-4">
                  <div className="space-y-1"> <Label htmlFor="payment-total-mobile" className="text-xs text-muted-foreground">Jami summa</Label> <Input id="payment-total-mobile" value={`${parseFloat(selectedOrder.final_price || 0).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50" /> </div>
                  <div className="text-center space-y-3"> <p className="text-sm text-muted-foreground">Mobil to'lov tizimini tanlang*</p> <div className="grid grid-cols-3 gap-2 sm:gap-3"> {["Payme", "Click", "Apelsin"].map((provider) => ( <Button key={provider} variant={selectedMobileProvider === provider ? "default" : "outline"} onClick={() => setSelectedMobileProvider(provider)} className="h-11 text-sm"> {provider} </Button> ))} </div> </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter className="mt-2"> <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Bekor qilish</Button> <Button onClick={handleCompletePayment} disabled={paymentMethod === "cash" && (isNaN(parseFloat(cashReceived)) || parseFloat(cashReceived) < parseFloat(selectedOrder.final_price || 0)) || (paymentMethod === "mobile" && !selectedMobileProvider)}>To'lovni Yakunlash</Button> </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* === CHEK KO'RSATISH DIALOGI (API BILAN YANGILANGAN) === */}
      <Dialog open={showReceiptDialog} onOpenChange={(open) => {
          if (!open) {
              // Dialog yopilganda state'larni tozalash
              setReceiptData(null);
              setReceiptError(null);
              setIsReceiptLoading(false);
              setReceiptOrderId(null);
              //setSelectedOrder(null); // Buni yopganda tozalash shart emas, chunki print tugmasi tozalaydi
          }
          setShowReceiptDialog(open);
      }}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle>Chek (Buyurtma #{receiptOrderId || 'N/A'})</DialogTitle>
                  {/* Agar xatolik bo'lmasa, description ko'rsatish */}
                  {!receiptError && <DialogDescription>To'lov ma'lumotlari.</DialogDescription>}
              </DialogHeader>

              {/* Yuklanish holati */}
              {isReceiptLoading && (
                  <div className="flex flex-col items-center justify-center h-40 my-4 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      Chek ma'lumotlari yuklanmoqda...
                  </div>
              )}

              {/* Xatolik holati */}
              {!isReceiptLoading && receiptError && (
                  <div className="flex flex-col items-center justify-center h-40 my-4 text-center text-destructive bg-destructive/10 p-4 rounded-md">
                      <AlertTriangle className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium mb-2">Xatolik!</p>
                      <p className="text-xs mb-4 break-words">{receiptError}</p>
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchReceiptData(receiptOrderId)} // receiptOrderId ni ishlatish
                          disabled={isReceiptLoading}
                      >
                          <RotateCcw className="mr-2 h-3 w-3" /> Qayta urinish
                      </Button>
                  </div>
              )}

              {/* Ma'lumotlar yuklangan holat */}
              {!isReceiptLoading && receiptData && (
                  <>
                      <ScrollArea className="max-h-[60vh] my-4">
                          <div className="p-4 border border-dashed border-foreground/50 rounded-md font-mono text-xs leading-relaxed bg-white text-black">
                              {/* Restoran Ma'lumotlari */}
                              <div className="text-center mb-3">
                                  <h3 className="font-bold text-sm uppercase">{receiptData.restaurant_name || 'Restoran Nomi'}</h3>
                                  {receiptData.restaurant_address && <p>{receiptData.restaurant_address}</p>}
                                  {receiptData.restaurant_phone && <p>Tel: {receiptData.restaurant_phone}</p>}
                                  {receiptData.restaurant_inn && <p>INN: {receiptData.restaurant_inn}</p>}
                              </div>
                              <Separator className="border-dashed border-black/50 my-2"/>

                              {/* Chek Ma'lumotlari */}
                              <div className="mb-2">
                                  {receiptData.cashier_name && <p>Kassir: {receiptData.cashier_name}</p>}
                                  {receiptData.payment_time && <p>Sana: {receiptData.payment_time}</p>}
                                  {receiptData.check_number && <p>Chek #: {receiptData.check_number}</p>}
                                  {receiptData.order_type_display && <p>Buyurtma turi: <span className="capitalize">{receiptData.order_type_display}</span></p>}
                                  {/* Agar stol nomi kerak bo'lsa, uni ham API dan olish kerak (agar berilsa) */}
                                  {/* {receiptData.table_name && <p>Stol: {receiptData.table_name}</p>} */}
                              </div>
                              <Separator className="border-dashed border-black/50 my-2"/>

                              {/* Mahsulotlar Ro'yxati */}
                              <div className="space-y-1 mb-2">
                                  {Array.isArray(receiptData.items) && receiptData.items.length > 0 ? (
                                      receiptData.items.map((item, index) => (
                                          <div key={`receipt-item-${index}-${item.product_name}`} className="grid grid-cols-[1fr_auto_auto] gap-1 items-start">
                                              <span className="col-span-3 font-medium break-words">{item.product_name || "Noma'lum"}</span>
                                              <span className="text-right">{item.quantity || 0} x {parseFloat(item.unit_price || 0).toLocaleString()}</span>
                                              <span>=</span>
                                              <span className="text-right font-medium">{parseFloat(item.total_item_price || 0).toLocaleString()}</span>
                                          </div>
                                      ))
                                  ) : (
                                      <p className="text-center text-gray-600">Mahsulotlar yo'q</p>
                                  )}
                              </div>
                              <Separator className="border-dashed border-black/50 my-2"/>

                              {/* Jami Summalar */}
                              <div className="space-y-1">
                                  {Number(receiptData.subtotal || 0) > 0 && <div className="flex justify-between"><span>Mahsulotlar jami:</span><span>{parseFloat(receiptData.subtotal).toLocaleString()} so'm</span></div>}
                                  {Number(receiptData.service_fee_percent || 0) > 0 && (
                                    // API service_fee_amount ni ham berishi kerak
                                    <div className="flex justify-between text-gray-700">
                                      <span>Xizmat haqi ({parseFloat(receiptData.service_fee_percent).toFixed(2)}%):</span>
                                      {/* Agar amount kelmasa, hisoblash mumkin: (subtotal * fee_percent / 100) */}
                                      <span>+ {parseFloat(receiptData.service_fee_amount || (receiptData.subtotal * receiptData.service_fee_percent / 100) || 0).toLocaleString()} so'm</span>
                                    </div>
                                  )}
                                  {Number(receiptData.tax_percent || 0) > 0 && (
                                    // API tax_amount ni ham berishi kerak
                                    <div className="flex justify-between text-gray-700">
                                      <span>Soliq ({parseFloat(receiptData.tax_percent).toFixed(2)}%):</span>
                                      {/* Agar amount kelmasa, hisoblash mumkin */}
                                      <span>+ {parseFloat(receiptData.tax_amount || (receiptData.subtotal * receiptData.tax_percent / 100) || 0).toLocaleString()} so'm</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-sm pt-1">
                                      <span>JAMI TO'LOV:</span>
                                      <span>{parseFloat(receiptData.final_price || 0).toLocaleString()} so'm</span>
                                  </div>
                              </div>
                              <Separator className="border-dashed border-black/50 my-2"/>

                              {/* To'lov Ma'lumoti */}
                              <div className="space-y-1">
                                  {receiptData.payment_method_display && <div className="flex justify-between"><span>To'lov usuli:</span><span className="capitalize">{receiptData.payment_method_display}</span></div>}
                                  {/* API naqd/qaytim ma'lumotlarini ham bersa, qo'shish mumkin */}
                                  {/* {receiptData.payment_method === 'cash' && ( <> <div className="flex justify-between"> <span>Naqd berildi:</span> <span>{parseFloat(receiptData.received_amount || 0).toLocaleString()} so'm</span> </div> <div className="flex justify-between"> <span>Qaytim:</span> <span>{parseFloat(receiptData.change_amount || 0).toLocaleString()} so'm</span> </div> </> )} */}
                              </div>
                              <Separator className="border-dashed border-black/50 my-2"/>
                              <div className="text-center mt-3">
                                  <p>Xaridingiz uchun rahmat!</p>
                                  <p>Yana keling!</p>
                              </div>
                          </div>
                      </ScrollArea>
                      <DialogFooter>
                          {/* Chop etish tugmasi faqat ma'lumot yuklanganda va xatolik bo'lmaganda ko'rinadi */}
                          <Button className="w-full" onClick={handlePrintAndCloseReceipt}>
                              <Printer className="mr-2 h-4 w-4" /> Chop etish va Yakunlash
                          </Button>
                      </DialogFooter>
                  </>
              )}
              {/* Agar yuklanmagan yoki xato bo'lsa, chop etish tugmasi ko'rinmaydi */}
              {!isReceiptLoading && !receiptData && !receiptError && (
                <div className="flex items-center justify-center h-20 text-muted-foreground">
                    Chek ma'lumotlari topilmadi.
                </div>
              )}
              {/* Agar xatolik bo'lsa, yopish tugmasini qo'shish */}
               {!isReceiptLoading && receiptError && (
                  <DialogFooter>
                     <DialogClose asChild>
                        <Button variant="outline">Yopish</Button>
                     </DialogClose>
                  </DialogFooter>
               )}

          </DialogContent>
      </Dialog>

      {/* Tarix Tafsilotlarini Ko'rish Dialogi (O'zgarishsiz) */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buyurtma Tafsilotlari (#{viewingOrderDetails?.id})</DialogTitle>
            {/* shadcn/ui Close tugmasini qo'shadi */}
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] my-4 pr-6">
            {viewingOrderDetails ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="p-3 bg-muted/50"> <CardTitle className="text-sm font-semibold">Asosiy ma'lumotlar</CardTitle> </CardHeader>
                  <CardContent className="p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <p><strong>ID:</strong> {viewingOrderDetails.id}</p>
                    <p><strong>Turi:</strong> {viewingOrderDetails.order_type_display}</p>
                    <p><strong>Holati:</strong> {viewingOrderDetails.payment ? "To'langan" : viewingOrderDetails.status_display || "Noma'lum"}</p>
                    <p><strong>Stol:</strong> {viewingOrderDetails.table?.name || "Yo'q"}</p>
                    <p><strong>Yaratildi:</strong> {new Date(viewingOrderDetails.created_at).toLocaleString("uz-UZ")}</p>
                    {viewingOrderDetails.payment?.timestamp && <p><strong>To'landi:</strong> {new Date(viewingOrderDetails.payment.timestamp).toLocaleString("uz-UZ")}</p>}
                    <p><strong>Jami:</strong> {parseFloat(viewingOrderDetails.final_price || 0).toLocaleString()} so'm</p>
                    {viewingOrderDetails.payment?.method_display && <p><strong>To'lov usuli:</strong> <span className="capitalize">{viewingOrderDetails.payment.method_display}</span></p>}
                    {viewingOrderDetails.payment?.processed_by_name && <p><strong>Kassir:</strong> {viewingOrderDetails.payment.processed_by_name}</p>}
                  </CardContent>
                </Card>
                {(viewingOrderDetails.customer_name || viewingOrderDetails.customer_phone || viewingOrderDetails.customer_address) && (
                  <Card>
                    <CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Mijoz</CardTitle></CardHeader>
                    <CardContent className="p-3 text-xs space-y-1">
                      {viewingOrderDetails.customer_name && <p><strong>Ism:</strong> {viewingOrderDetails.customer_name}</p>}
                      {viewingOrderDetails.customer_phone && <p><strong>Telefon:</strong> {viewingOrderDetails.customer_phone}</p>}
                      {viewingOrderDetails.customer_address && <p><strong>Manzil:</strong> {viewingOrderDetails.customer_address}</p>}
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Tarkibi</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {Array.isArray(viewingOrderDetails.items) && viewingOrderDetails.items.length > 0 ? (
                      <ul className="divide-y">
                        {viewingOrderDetails.items.map((item) => (
                          <li key={item.id || `detail-item-${item.product}`} className="flex items-center justify-between p-3 gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={item.product_details?.image_url || "/placeholder-product.jpg"} alt={item.product_details?.name || ""} className="w-8 h-8 object-cover rounded shrink-0" onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}/>
                              <span className="font-medium truncate">{item.product_details?.name || "Noma'lum"}</span>
                              <span className="text-muted-foreground">(x{item.quantity})</span>
                            </div>
                            <span className="font-semibold whitespace-nowrap">{parseFloat(item.total_price || 0).toLocaleString()} so'm</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="p-4 text-center text-muted-foreground text-xs">Tarkibi topilmadi.</p>}
                  </CardContent>
                </Card>
                {/* Tarixda ham chek ko'rish tugmasi qo'shish mumkin */}
                {viewingOrderDetails.payment && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => fetchReceiptData(viewingOrderDetails.id)} // Shu yerda ham chaqirish
                        disabled={isReceiptLoading && receiptOrderId === viewingOrderDetails.id} // Agar shu ID yuklanayotgan bo'lsa
                    >
                        {isReceiptLoading && receiptOrderId === viewingOrderDetails.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Receipt className="mr-2 h-4 w-4"/>}
                        Chekni Ko'rish
                    </Button>
                )}
              </div>
            ) : ( <p className="text-center text-muted-foreground py-6">Ma'lumotlar topilmadi.</p> )}
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}