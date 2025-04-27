"use client"

import { useState, useEffect, useCallback } from "react" // useCallback qo'shildi
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  CheckCircle,
  Clock,
  LogOut,
  MapPin,
  Phone,
  Truck,
  User,
  DollarSign,
  CreditCard,
  Smartphone,
  Info,
  Package,
  Loader2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// To'lov usulini matnga o'girish
function getPaymentMethodText(method) {
    switch (method?.toLowerCase()) {
        case "cash": return "Naqd pul";
        case "card": return "Karta";
        case "mobile": return "Mobil to'lov";
        case 'free': return 'Bepul';
        default: return method || "Noma'lum";
    }
}

// Buyurtma obyektini standart formatga keltirish (ikkala API uchun)
const mapOrderData = (order) => ({
  id: order.id,
  customer: { name: order.customer_name || "Noma'lum", phone: order.customer_phone || "Noma'lum", address: order.customer_address || "Noma'lum" },
  items: order.items ? order.items.map((item) => ({ id: item.id, productId: item.product, name: item.product_details?.name || "Noma'lum mahsulot", quantity: item.quantity, unit_price: parseFloat(item.unit_price) || 0, total_price: parseFloat(item.total_price) || 0, image_url: item.product_details?.image_url || null })) : [],
  total: parseFloat(order.final_price) || 0,
  subtotal: parseFloat(order.total_price) || 0,
  serviceFeePercent: parseFloat(order.service_fee_percent) || 0,
  taxPercent: parseFloat(order.tax_percent) || 0,
  timestamp: new Date(order.created_at),
  updatedTimestamp: new Date(order.updated_at),
  status: order.status,
  status_display: order.status_display,
  isPaid: !!order.payment || order.final_price === 0,
  payment: order.payment || null,
  paymentMethod: order.payment?.method || (order.final_price === 0 ? 'free' : null),
  paymentMethodDisplay: getPaymentMethodText(order.payment?.method || (order.final_price === 0 ? 'free' : null)) || "To'lanmagan",
  item_count: order.items?.length || 0,
  paidAt: order.payment?.paid_at ? new Date(order.payment.paid_at) : null
});


export default function DeliveryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("ready")
  const [orders, setOrders] = useState([]) // Tayyor, Yetkazilmoqda, Yetkazildi (to'lanmagan) uchun
  const [paidOrders, setPaidOrders] = useState([]) // Faqat To'langanlar uchun
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash")
  const [cashReceivedForPayment, setCashReceivedForPayment] = useState("")
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingPaid, setIsFetchingPaid] = useState(false) // To'langanlarni yuklash holati
  const [error, setError] = useState("")

  const getToken = () => {
      if (typeof window !== "undefined") {
          return localStorage.getItem("token")
      }
      return null
  }

  // To'langan buyurtmalarni yuklash funksiyasi
  const fetchPaidOrders = useCallback(async (token) => {
    setIsFetchingPaid(true);
    try {
      const res = await axios.get("https://oshxonacopy.pythonanywhere.com/api/delivery/paid-orders/", {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      console.log("API javobi (Paid Orders):", res.data)
      const paidData = Array.isArray(res.data) ? res.data : [];
      setPaidOrders(paidData.map(mapOrderData));
    } catch (err) {
      console.error("To'langan buyurtmalarni yuklashda xato:", err);
      toast.error("To'langan buyurtmalarni yuklashda xatolik yuz berdi.");
    } finally {
        setIsFetchingPaid(false);
    }
  }, []);

  // Asosiy ma'lumotlarni yuklash
  useEffect(() => {
    setIsLoading(true);
    setError("");
    const token = getToken();
    if (!token) {
      router.push("/auth");
      setIsLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        const results = await Promise.allSettled([
          axios.get("https://oshxonacopy.pythonanywhere.com/api/orders/", {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }),
          axios.get("https://oshxonacopy.pythonanywhere.com/api/delivery/paid-orders/", {
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          })
        ]);

        let generalOrdersError = null;
        let paidOrdersError = null;

        if (results[0].status === 'fulfilled') {
          console.log("API javobi (General Orders):", results[0].value.data);
          const data = Array.isArray(results[0].value.data) ? results[0].value.data : [];
          const deliveryOrders = data
            .filter(order => order.order_type === "delivery" && order.status !== 'paid')
            .map(mapOrderData);
          setOrders(deliveryOrders);
        } else {
          console.error("Umumiy buyurtmalarni yuklashda xato:", results[0].reason);
          generalOrdersError = results[0].reason;
          setOrders([]);
        }

        if (results[1].status === 'fulfilled') {
            console.log("API javobi (Paid Orders):", results[1].value.data);
            const paidData = Array.isArray(results[1].value.data) ? results[1].value.data : [];
            setPaidOrders(paidData.map(mapOrderData));
        } else {
            console.error("To'langan buyurtmalarni yuklashda xato:", results[1].reason);
            paidOrdersError = results[1].reason;
            setPaidOrders([]);
        }

        if (generalOrdersError || paidOrdersError) {
            let errorMessage = "";
            if (generalOrdersError?.response?.status === 401 || paidOrdersError?.response?.status === 401) {
                errorMessage = "Avtorizatsiya xatosi. Iltimos, qayta kiring.";
                localStorage.removeItem("token");
                router.push("/auth");
            } else {
                errorMessage = "Buyurtmalarni yuklashda xatolik yuz berdi.";
                if (generalOrdersError?.response?.data?.detail) errorMessage += ` (${generalOrdersError.response.data.detail})`;
                if (paidOrdersError?.response?.data?.detail) errorMessage += ` (${paidOrdersError.response.data.detail})`;
            }
            setError(errorMessage);
            toast.error(errorMessage);
        } else if (orders.length === 0 && paidOrders.length === 0 && results[0].status === 'fulfilled' && results[1].status === 'fulfilled') {
             // Faqat ikkala so'rov ham muvaffaqiyatli bo'lsa va ikkalasi ham bo'sh bo'lsa xabar chiqarish
             toast.info("Hozirda yetkazib berish buyurtmalari mavjud emas.")
        }

      } catch (err) {
        console.error("Ma'lumot yuklashda kutilmagan xato:", err);
        setError("Ma'lumotlarni yuklashda noma'lum xato.");
        toast.error("Ma'lumotlarni yuklashda noma'lum xato.");
        setOrders([]);
        setPaidOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Dependency array soddalashtirildi

  // Yetkazishni boshlash
  const handleStartDelivery = async (orderId) => {
    const token = getToken();
    if (!token) { toast.error("Autentifikatsiya tokeni topilmadi"); return; }
    const originalOrders = [...orders];
    const updatedOrders = orders.map((o) => o.id === orderId ? { ...o, status: "delivering", status_display: "Yetkazilmoqda", updatedTimestamp: new Date() } : o);
    setOrders(updatedOrders); // Optimistik UI yangilanishi
    setActiveTab("delivering");
    try {
      const response = await axios.post(`https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/start_delivery/`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Buyurtma #${orderId} yetkazish boshlandi!`);
      // API dan kelgan aniq status bilan yana yangilash (ixtiyoriy)
      setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? mapOrderData(response.data) : o));
    } catch (err) {
      setOrders(originalOrders); // Xatolik bo'lsa orqaga qaytarish
      setActiveTab("ready");
      console.error("Yetkazishni boshlashda xato:", err);
      const errorMessage = err.response?.data?.detail || "Yetkazishni boshlashda xato";
      setError("Xatolik: " + errorMessage); toast.error(errorMessage);
    }
  }

  // Yetkazishni yakunlash (mark_delivered)
  const handleCompleteDeliveryClick = (order) => {
    if (!order) { toast.warn("Buyurtma topilmadi."); return; }
    handleCompleteDeliveryDirectly(order.id);
  }
  const handleCompleteDeliveryDirectly = async (orderId) => {
    const token = getToken();
    if (!token) { toast.error("Autentifikatsiya tokeni topilmadi"); return; }
    const originalOrders = [...orders];
    const updatedOrders = orders.map((o) => o.id === orderId ? { ...o, status: "delivered", status_display: "Yetkazildi", updatedTimestamp: new Date() } : o);
    setOrders(updatedOrders); // Optimistik UI yangilanishi
    setActiveTab("delivered");
    try {
      const response = await axios.post(`https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/mark_delivered/`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Buyurtma #${orderId} yetkazildi deb belgilandi!`);
      // API dan kelgan aniq status bilan yana yangilash (ixtiyoriy)
       setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? mapOrderData(response.data) : o));
    } catch (err) {
      setOrders(originalOrders); // Xatolik bo'lsa orqaga qaytarish
      setActiveTab("delivering");
      console.error("Yetkazib berishni yakunlashda xato:", err);
      const errorMessage = err.response?.data?.detail || "Yetkazib berishni yakunlashda xato";
      setError("Xatolik: " + errorMessage); toast.error(errorMessage);
    }
  }

  // Batafsil ko'rish (Modal uchun)
  const handleViewOrderDetailsModal = (order) => {
    setSelectedOrder(order);
    setShowOrderDetailsDialog(true);
  }

  // Vaqtni formatlash va farqini hisoblash
  const formatTimeOnly = (date) => {
      if (!(date instanceof Date) || isNaN(date.getTime())) return "N/A";
      return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  };
  const getTimeDifference = (date) => {
      if (!(date instanceof Date) || isNaN(date.getTime())) return "N/A";
      const now = Date.now();
      const diffSeconds = Math.floor((now - date.getTime()) / 1000);
      if (diffSeconds < 60) return `${diffSeconds} soniya`;
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes} daqiqa`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} soat`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} kun`;
  };

  // Tizimdan chiqish
  const handleLogout = () => {
      localStorage.removeItem("token");
      router.push("/auth");
      toast.info("Tizimdan chiqildi");
  };

  // ---- To'lovni qayd etish Funksiyalari ----
  const handleOpenPaymentDialog = (order) => {
    if (!order || order.isPaid) return;
    setSelectedOrder(order);
    setSelectedPaymentMethod("cash");
    setCashReceivedForPayment("");
    setIsProcessingPayment(false);
    setShowPaymentDialog(true);
  }

  const handleProcessPayment = async () => {
    if (!selectedOrder || isProcessingPayment) return;
    const token = getToken();
    if (!token) { toast.error("Autentifikatsiya tokeni topilmadi"); return; }
    let requestBody = { method: selectedPaymentMethod };
    if (selectedPaymentMethod === "cash") {
      const received = parseFloat(cashReceivedForPayment);
      if (isNaN(received) || received < selectedOrder.total) {
        toast.error("Naqd pul uchun qabul qilingan summa noto'g'ri yoki yetarli emas!");
        return;
      }
      requestBody.received_amount = received;
    }
    setIsProcessingPayment(true);
    try {
      const response = await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${selectedOrder.id}/process_payment/`,
        requestBody,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Buyurtma #${selectedOrder.id} uchun to'lov muvaffaqiyatli qayd etildi!`);
      setShowPaymentDialog(false);

      // 'orders' state'dan olib tashlash
      setOrders(prevOrders => prevOrders.filter(order => order.id !== selectedOrder.id));

      // 'paidOrders' ni yangilash (yangi to'langan buyurtmani qo'shish)
      // API javobidan foydalanish yaxshiroq, lekin fetchPaidOrders ham ishlayveradi
      const newPaidOrderData = mapOrderData(response.data); // To'liq ma'lumotni olish
      setPaidOrders(prevPaidOrders => [newPaidOrderData, ...prevPaidOrders]); // Yangisini boshiga qo'shish

      // Agar fetchPaidOrders ishlatmoqchi bo'lsangiz:
      // if (token) {
      //   await fetchPaidOrders(token); // To'liq qayta yuklash
      // }

      setActiveTab("paid");
      setSelectedOrder(null);

    } catch (err) {
      console.error("To'lovni qayd etishda xato:", err);
      const errorMessage = err.response?.data?.detail || err.response?.data?.received_amount?.[0] || "To'lovni qayd etishda noma'lum xato";
      toast.error(`Xatolik: ${errorMessage}`);
    } finally {
      setIsProcessingPayment(false);
    }
  }

  const calculatePaymentChange = () => {
    if (selectedPaymentMethod !== 'cash' || !cashReceivedForPayment || !selectedOrder?.total) return 0;
    const received = parseFloat(cashReceivedForPayment);
    const total = parseFloat(selectedOrder.total);
    if (isNaN(received) || isNaN(total) || received < total) return 0;
    return received - total;
  }
  // -----------------------------------------------------------


  // Yuklanish holati
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
           <Loader2 className="animate-spin h-8 w-8 text-primary" />
           <span>Yuklanmoqda...</span>
         </div>
      </div>
    );
  }

  // Asosiy UI
  return (
    <div className="flex h-screen flex-col bg-muted/10">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />

      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 shrink-0 sticky top-0 z-20">
           <div className="flex items-center space-x-4">
             <Button variant="ghost" size="icon" onClick={() => router.back()} title="Ortga">
               <ArrowLeft className="h-5 w-5" />
             </Button>
             <h1 className="text-xl font-bold">Yetkazib berish</h1>
           </div>
           <div className="flex items-center space-x-4">
             <Button variant="outline" size="icon" onClick={handleLogout} title="Chiqish">
               <LogOut className="h-5 w-5" />
             </Button>
           </div>
      </header>

      {/* Asosiy Kontent */}
      <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarGutter: 'stable' }}>
        {/* Xatolik xabari */}
        {error && (
            <div className="mb-4 flex flex-col items-center justify-center rounded-md border border-destructive bg-destructive/10 p-4 text-center text-sm text-destructive">
                <p className="mb-2">{error}</p>
                <Button variant="destructive" size="sm" onClick={() => { setIsLoading(true); setError(""); window.location.reload(); }}>
                Qayta yuklash
                </Button>
            </div>
        )}

        {/* Tablar */}
        <Tabs defaultValue="ready" value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab List */}
          <div className="top-2 bg-muted/10 pt-1 pb-2 z-10 -mx-4 px-4 border-b mb-4 flex justify-start">
             <TabsList className="grid w-full max-w-lg grid-cols-4">
                <TabsTrigger value="ready">Tayyor</TabsTrigger>
                <TabsTrigger value="delivering">Yetkazilmoqda</TabsTrigger>
                <TabsTrigger value="delivered">Yetkazildi</TabsTrigger>
                <TabsTrigger value="paid">To'langan</TabsTrigger>
             </TabsList>
          </div>

          {/* Tab Kontentlari */}
          {["ready", "delivering", "delivered", "paid"].map((tabValue) => {
            // Joriy tab uchun ma'lumotlar va holatlar
            let currentOrdersList = [];
            let isCurrentLoading = false;
            let isEmpty = true;

            if (tabValue === 'paid') {
                currentOrdersList = paidOrders; // Saralashni map ichida qilamiz
                isCurrentLoading = isFetchingPaid; // Faqat paid uchun alohida loading
                isEmpty = !isCurrentLoading && currentOrdersList.length === 0;
            } else {
                currentOrdersList = orders.filter(order => order.status === tabValue);
                isCurrentLoading = isLoading; // Boshqa tablar umumiy loading ga bog'liq
                isEmpty = !isCurrentLoading && currentOrdersList.length === 0;
            }

             // Saralash (updatedTimestamp yoki paidAt bo'yicha)
             currentOrdersList.sort((a, b) => {
                const timeA = (tabValue === 'paid' ? a.paidAt : a.updatedTimestamp) || 0;
                const timeB = (tabValue === 'paid' ? b.paidAt : b.updatedTimestamp) || 0;
                // Agar Date obyekti bo'lsa getTime() ni ishlatamiz
                const timestampA = timeA instanceof Date ? timeA.getTime() : 0;
                const timestampB = timeB instanceof Date ? timeB.getTime() : 0;
                return timestampB - timestampA;
             });


            return (
              <TabsContent key={tabValue} value={tabValue} className="mt-4">
                {/* Loading holati */}
                {isCurrentLoading && (
                    <div className="col-span-full flex items-center justify-center h-60 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>
                            {tabValue === 'paid' ? "To'langan buyurtmalar yuklanmoqda..." : "Yuklanmoqda..."}
                        </span>
                    </div>
                )}
                {/* Bo'sh holat */}
                {isEmpty && !isCurrentLoading && (
                   <div className="col-span-full flex flex-col items-center justify-center h-60 rounded-md border border-dashed p-6 text-center text-muted-foreground">
                     {tabValue === "paid" ? <CheckCheck className="mb-3 h-12 w-12 text-gray-400" /> : <Truck className="mb-3 h-12 w-12 text-gray-400" />}
                     <h3 className="text-lg font-medium">
                       {tabValue === "ready" && "Tayyor buyurtmalar yo'q"}
                       {tabValue === "delivering" && "Yetkazilayotgan buyurtmalar yo'q"}
                       {tabValue === "delivered" && "Yetkazilgan (to'lanmagan) buyurtmalar yo'q"}
                       {tabValue === "paid" && "To'langan buyurtmalar yo'q"}
                     </h3>
                     <p className="text-sm mt-1">
                       {tabValue === "ready" && "Yangi buyurtmalar bu yerda ko'rinadi."}
                       {tabValue === "delivering" && "Yetkazish boshlanganda bu yerda ko'rinadi."}
                       {tabValue === "delivered" && "Mijozga topshirilgan, ammo to'lovi kutilayotganlar bu yerda ko'rinadi."}
                       {tabValue === "paid" && "To'lovi yakunlangan buyurtmalar bu yerda ko'rinadi."}
                     </p>
                   </div>
                 )}

                {/* Buyurtmalar ro'yxati */}
                {!isCurrentLoading && currentOrdersList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentOrdersList.map((order) => (
                        <Card key={order.id} className={`overflow-hidden mt-4 flex flex-col h-full shadow-sm border ${order.isPaid ? 'border-green-300 bg-green-50/30' : ''}`}>
                            {/* Card Header */}
                            <CardHeader className="p-3 bg-muted/30 flex flex-row justify-between items-center space-y-0">
                                <div className="flex flex-col">
                                    <CardTitle className="text-sm font-semibold leading-none"> Buyurtma #{order.id} </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {/* Vaqtni ko'rsatish */}
                                        {order.status === 'paid' && order.paidAt
                                            ? `${formatTimeOnly(order.paidAt)} (${getTimeDifference(order.paidAt)} oldin)`
                                            : `${formatTimeOnly(order.updatedTimestamp)} (${getTimeDifference(order.updatedTimestamp)} oldin)`
                                        }
                                    </p>
                                </div>
                                <Badge variant={
                                    order.status === 'paid' ? 'success' :
                                    order.status === 'delivered' ? 'default' :
                                    order.status === 'delivering' ? 'secondary' :
                                    'outline'
                                } className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 whitespace-nowrap h-5 ${order.status === 'paid' ? 'bg-green-600 text-white' : ''}`}>
                                    {order.status === 'ready' && <Clock className="h-2.5 w-2.5" />}
                                    {order.status === 'delivering' && <Truck className="h-2.5 w-2.5" />}
                                    {order.status === 'delivered' && <Check className="h-2.5 w-2.5" />}
                                    {order.status === 'paid' && <CheckCircle className="h-2.5 w-2.5" />}
                                    {order.status_display || order.status}
                                </Badge>
                            </CardHeader>

                            {/* Card Content */}
                            <CardContent className="p-3 flex-1 space-y-2 text-xs">
                                {/* Mijoz Info */}
                                <div className="space-y-1 border-b pb-2">
                                    <div className="flex items-center gap-1.5"> <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium truncate">{order.customer.name}</span> </div>
                                    <div className="flex items-center gap-1.5"> <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> <a href={`tel:${order.customer.phone}`} className="text-blue-600 hover:underline">{order.customer.phone}</a> </div>
                                    <div className="flex items-start gap-1.5"> <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-px" /> <span className="line-clamp-2">{order.customer.address}</span> </div>
                                </div>
                                {/* Tarkibi */}
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-medium text-muted-foreground flex items-center gap-1"> <Package className="h-3.5 w-3.5"/> Tarkibi ({order.item_count} ta) </h4>
                                    {order.items && order.items.length > 0 ? (
                                        <div className="space-y-1">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex justify-between items-center gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <img src={item.image_url || "/placeholder-product.jpg"} alt={item.name} className="h-5 w-5 rounded-sm object-cover flex-shrink-0 border" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.jpg"; }} loading="lazy" />
                                                    <span className="truncate font-medium">{item.name}</span> <span className="text-muted-foreground whitespace-nowrap">(x{item.quantity})</span>
                                                </div>
                                                <span className="font-medium whitespace-nowrap text-right">{item.total_price.toLocaleString()} so'm</span>
                                                </div>
                                            ))}
                                        </div>
                                        ) : ( <p className="text-center text-muted-foreground py-2">Mahsulotlar yo'q.</p> )}
                                </div>
                                {/* Jami & To'lov */}
                                <div className="space-y-0.5 pt-2 border-t">
                                    <div className="flex justify-between items-center"> <span className="text-muted-foreground">Jami summa:</span> <span className="font-semibold">{order.total.toLocaleString()} so'm</span> </div>
                                    <div className="flex justify-between items-center"> <span className="text-muted-foreground">To'lov:</span>
                                        {order.isPaid ? ( <Badge variant="success" className="text-[10px] px-1.5 py-0.5 h-5 bg-green-100 text-green-800"> To'langan ({order.paymentMethodDisplay}) </Badge>
                                        ) : ( <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5"> To'lanmagan </Badge> )}
                                    </div>
                                </div>
                            </CardContent>

                            {/* Card Footer */}
                            <CardFooter className="flex items-center gap-2 border-t p-2 mt-auto">
                                <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => handleViewOrderDetailsModal(order)}> <Info className="h-3.5 w-3.5 mr-1"/> Batafsil </Button>
                                {order.status === "ready" && ( <Button variant="default" size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8" onClick={() => handleStartDelivery(order.id)}> <Truck className="h-3.5 w-3.5 mr-1"/> Boshlash </Button> )}
                                {order.status === "delivering" && ( <Button variant="primary" size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8" onClick={() => handleCompleteDeliveryClick(order)}> <Check className="h-3.5 w-3.5 mr-1"/> Yetkazildi </Button> )}
                                {order.status === "delivered" && !order.isPaid && order.total > 0 && ( <Button variant="success" size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-8" onClick={() => handleOpenPaymentDialog(order)}> <CheckCircle className="h-3.5 w-3.5 mr-1"/> To'lovni Qayd etish </Button> )}
                            </CardFooter>
                        </Card>
                        ))}
                    </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Modal (Batafsil ko'rish uchun) */}
      {selectedOrder && showOrderDetailsDialog && (
        <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
           <DialogContent className="sm:max-w-md">
             <DialogHeader>
               <DialogTitle>Buyurtma #{selectedOrder.id} (Batafsil)</DialogTitle>
               <DialogDescription>
                 {formatTimeOnly(selectedOrder.timestamp)} da qabul qilingan
               </DialogDescription>
             </DialogHeader>
             <ScrollArea className="max-h-[60vh] py-4 pr-3">
                {/* ... details modal content ... */}
                <div className="space-y-4 text-sm">
                 {/* Mijoz (Modal) */}
                 <div className="space-y-1">
                   <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mijoz</h3>
                   <div className="space-y-1 border p-2 rounded-md bg-muted/30">
                       <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/><span>{selectedOrder.customer.name}</span></div>
                       <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/><span>{selectedOrder.customer.phone}</span></div>
                       <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5"/><span>{selectedOrder.customer.address}</span></div>
                   </div>
                 </div>
                 {/* Tarkibi (Modal) */}
                 <div className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tarkibi</h3>
                    <div className="space-y-1 border rounded-md divide-y bg-muted/30">
                     {selectedOrder.items && selectedOrder.items.length > 0 ? (
                       selectedOrder.items.map((item) => (
                         <div key={`modal-${item.id}`} className="flex items-center justify-between gap-2 p-2">
                           <div className="flex items-center gap-2">
                             <img src={item.image_url || "/placeholder-product.jpg"} alt={item.name} className="w-8 h-8 object-cover rounded-md flex-shrink-0 border" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.jpg"; }}/>
                             <div>
                               <div className="font-medium">{item.name}</div>
                               <div className="text-xs text-muted-foreground">x{item.quantity} @ {item.unit_price.toLocaleString()}</div>
                             </div>
                           </div>
                           <div className="font-semibold whitespace-nowrap">
                             {item.total_price.toLocaleString()} so'm
                           </div>
                         </div>
                       ))
                     ) : ( <div className="p-4 text-center text-muted-foreground">Mahsulotlar mavjud emas</div> )}
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-semibold px-2">
                       <span>Jami:</span>
                       <span>{selectedOrder.total.toLocaleString()} so'm</span>
                     </div>
                 </div>
                 {/* To'lov (Modal) */}
                 <div className="space-y-1">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">To'lov</h3>
                    <div className="space-y-1 border p-2 rounded-md bg-muted/30">
                        <div className="flex justify-between">
                            <span>Holati:</span>
                            <Badge variant={selectedOrder.isPaid ? "success" : "outline"} className={`text-[10px] px-1.5 py-0.5 h-5 ${selectedOrder.isPaid ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" : ""}`}>
                                {selectedOrder.isPaid ? "To'langan" : "To'lanmagan"}
                            </Badge>
                        </div>
                        {selectedOrder.payment && (
                          <>
                            <div className="flex justify-between"><span>Usul:</span><span className="font-medium capitalize">{selectedOrder.paymentMethodDisplay}</span></div>
                            <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t mt-1"><span>Vaqti:</span><span>{new Date(selectedOrder.payment.paid_at).toLocaleString('uz-UZ')}</span></div>
                            <div className="flex justify-between text-xs text-muted-foreground"><span>Kassir:</span><span>{selectedOrder.payment.processed_by_name || 'N/A'}</span></div>
                          </>
                        )}
                    </div>
                 </div>
               </div>
             </ScrollArea>
             <DialogFooter>
               <Button variant="outline" onClick={() => setShowOrderDetailsDialog(false)}>Yopish</Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>
      )}

      {/* Yangi To'lov Modali */}
      {selectedOrder && showPaymentDialog && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
           <DialogContent className="sm:max-w-lg">
             <DialogHeader>
               <DialogTitle>Buyurtma #{selectedOrder.id} uchun To'lov</DialogTitle>
               <DialogDescription>
                 To'lov usulini tanlang va kerakli ma'lumotlarni kiriting.
               </DialogDescription>
             </DialogHeader>
             <div className="py-4 space-y-4">
                {/* ... payment modal content ... */}
                {/* Jami Summa */}
               <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                 <span className="text-sm font-medium text-muted-foreground">To'lanishi kerak:</span>
                 <span className="text-lg font-bold">{selectedOrder.total.toLocaleString()} so'm</span>
               </div>
               {/* To'lov Usuli Tanlash */}
               <div className="space-y-2">
                 <Label className="text-sm font-medium">To'lov usuli</Label>
                 <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="grid grid-cols-3 gap-4">
                   {[ { value: 'cash', label: 'Naqd', icon: DollarSign },
                      { value: 'card', label: 'Karta', icon: CreditCard },
                      { value: 'mobile', label: 'Mobil', icon: Smartphone } ].map((item) => (
                     <Label
                       key={item.value}
                       htmlFor={`payment-${item.value}`}
                       className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${selectedPaymentMethod === item.value ? 'border-primary' : ''}`}
                     >
                       <RadioGroupItem value={item.value} id={`payment-${item.value}`} className="sr-only" />
                       <item.icon className="mb-3 h-6 w-6" />
                       {item.label}
                     </Label>
                   ))}
                 </RadioGroup>
               </div>
               {/* Naqd Pul Uchun Qo'shimcha Maydon */}
               {selectedPaymentMethod === 'cash' && (
                 <div className="space-y-3 pt-2 border-t border-dashed">
                    <div className="space-y-1">
                       <Label htmlFor="cash-received-payment">Qabul qilingan summa*</Label>
                       <Input
                           id="cash-received-payment"
                           type="number"
                           placeholder="Mijoz bergan summa"
                           value={cashReceivedForPayment}
                           onChange={(e) => setCashReceivedForPayment(e.target.value.replace(/\D/g,''))}
                           className="h-10 text-base"
                           min={selectedOrder.total.toString()}
                           required
                       />
                   </div>
                    {parseFloat(cashReceivedForPayment) >= selectedOrder.total && (
                     <div className="flex justify-between items-center p-2 bg-green-100 rounded-md">
                         <span className="text-sm font-medium text-green-800">Qaytim:</span>
                         <span className="text-sm font-bold text-green-800">{calculatePaymentChange().toLocaleString()} so'm</span>
                     </div>
                    )}
                 </div>
               )}
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={isProcessingPayment}>
                 <XCircle className="h-4 w-4 mr-1"/> Bekor qilish
               </Button>
               <Button
                 onClick={handleProcessPayment}
                 disabled={isProcessingPayment || (selectedPaymentMethod === 'cash' && (!cashReceivedForPayment || parseFloat(cashReceivedForPayment) < selectedOrder.total))}
               >
                 {isProcessingPayment ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 ) : (
                     <CheckCircle className="h-4 w-4 mr-1"/>
                 )}
                 {isProcessingPayment ? "Qayta ishlanmoqda..." : "To'lovni Tasdiqlash"}
               </Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>
      )}

    </div> // <--- RETURN UCHUN YOPUVCHI QAVS
  );
} // <--- KOMPONENT FUNKSIYASINING YOPUVCHI QAVSI