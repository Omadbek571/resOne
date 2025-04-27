"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
// React Query
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
// Axios
import axios, { AxiosError } from "axios"
// Ikonkalar
import {
  ArrowLeft, Check, CheckCheck, CheckCircle, Clock, LogOut, MapPin, Phone, Truck, User,
  DollarSign, CreditCard, Smartphone, Info, Package, Loader2, XCircle, RotateCcw
} from "lucide-react"
// Shadcn/ui komponentlar
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea" // Agar kerak bo'lsa
import { ScrollArea } from "@/components/ui/scroll-area"
// import { Separator } from "@/components/ui/separator" // Agar kerak bo'lsa
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
// Toastify
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// ----- TypeScript Interfeyslari (Taxminiy, API javobiga moslashtiring) -----
interface CustomerInfo { name: string; phone: string; address: string; }
interface OrderItemMapped { id: number; productId: number; name: string; quantity: number; unit_price: number; total_price: number; image_url: string | null; }
interface PaymentInfoMapped { id: number; method: string; paid_at: string; processed_by_name?: string | null; /* ...boshqa maydonlar */ }
interface MappedOrder {
  id: number;
  customer: CustomerInfo;
  items: OrderItemMapped[];
  total: number;
  subtotal: number;
  serviceFeePercent: number;
  taxPercent: number;
  timestamp: Date;
  updatedTimestamp: Date;
  status: string; // 'ready', 'delivering', 'delivered', 'paid'
  status_display: string;
  isPaid: boolean;
  payment: PaymentInfoMapped | null;
  paymentMethod: string | null; // 'cash', 'card', 'mobile', 'free'
  paymentMethodDisplay: string;
  item_count: number;
  paidAt: Date | null;
}

// ----- API Konfiguratsiyasi va Yordamchi Funksiyalar -----
const API_BASE_URL = "https://oshxonacopy.pythonanywhere.com/api"

const apiClient = axios.create({ baseURL: API_BASE_URL });

const getToken = (): string | null => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("token");
    }
    return null;
};

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.headers) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const handleApiError = (error: unknown, context: string, router: ReturnType<typeof useRouter> | null = null) => {
    console.error(`${context} xatosi:`, error);
    let errorMessage = `Noma'lum xatolik (${context})`;
    if (error instanceof AxiosError) {
        if (error.response) {
            if (error.response.status === 401 && router) {
                errorMessage = "Avtorizatsiya xatosi yoki sessiya muddati tugagan.";
                if (localStorage.getItem("token")) {
                    localStorage.removeItem("token");
                    toast.error(errorMessage + " Iltimos, qayta kiring.");
                    router.push("/auth");
                }
                return errorMessage;
            }
            errorMessage = error.response.data?.detail || error.response.data?.message || JSON.stringify(error.response.data) || `Server xatosi (${error.response.status})`;
        } else if (error.request) {
            errorMessage = "Server bilan bog'lanishda xatolik.";
        } else {
            errorMessage = error.message;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    // Qayta-qayta bir xil xatoni toast qilmaslik uchun tekshirish mumkin
    // Hozircha oddiy toast
    toast.error(`${context}: ${errorMessage}`);
    return errorMessage;
};


function getPaymentMethodText(method: string | null | undefined): string {
    switch (method?.toLowerCase()) {
        case "cash": return "Naqd pul";
        case "card": return "Karta";
        case "mobile": return "Mobil to'lov";
        case 'free': return 'Bepul';
        default: return method || "Noma'lum";
    }
}

const mapOrderData = (order: any): MappedOrder => ({
  id: order.id,
  customer: { name: order.customer_name || "Noma'lum", phone: order.customer_phone || "Noma'lum", address: order.customer_address || "Noma'lum" },
  items: order.items ? order.items.map((item: any) => ({ id: item.id, productId: item.product, name: item.product_details?.name || "Noma'lum mahsulot", quantity: item.quantity, unit_price: parseFloat(item.unit_price) || 0, total_price: parseFloat(item.total_price) || 0, image_url: item.product_details?.image_url || null })) : [],
  total: parseFloat(order.final_price) || 0,
  subtotal: parseFloat(order.total_price) || 0,
  serviceFeePercent: parseFloat(order.service_fee_percent) || 0,
  taxPercent: parseFloat(order.tax_percent) || 0,
  timestamp: new Date(order.created_at),
  updatedTimestamp: new Date(order.updated_at || order.created_at),
  status: order.status,
  status_display: order.status_display,
  isPaid: !!order.payment || (order.final_price === 0 && order.status === 'delivered'),
  payment: order.payment ? {
      id: order.payment.id,
      method: order.payment.method,
      paid_at: order.payment.paid_at || order.payment.timestamp,
      processed_by_name: order.payment.processed_by_name,
  } : null,
  paymentMethod: order.payment?.method || (order.final_price === 0 && order.status === 'delivered' ? 'free' : null),
  paymentMethodDisplay: getPaymentMethodText(order.payment?.method || (order.final_price === 0 && order.status === 'delivered' ? 'free' : null)) || "To'lanmagan",
  item_count: order.items?.length || 0,
  paidAt: order.payment?.paid_at || order.payment?.timestamp ? new Date(order.payment.paid_at || order.payment.timestamp) : null
});


// ==========================================================================
// Yetkazib Berish Sahifasi Komponenti (DeliveryPage)
// ==========================================================================
export default function DeliveryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState("ready");
  const [selectedOrder, setSelectedOrder] = useState<MappedOrder | null>(null);
  const [showOrderDetailsDialog, setShowOrderDetailsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [cashReceivedForPayment, setCashReceivedForPayment] = useState("");

  useEffect(() => {
      setIsClient(true);
  }, []);

  const token = getToken();

  // ----- React Query So'rovlari (`useQuery`) -----

  // 1. Umumiy buyurtmalarni olish
  const {
      data: deliveryOrders = [],
      isLoading: isLoadingGeneral,
      isError: isErrorGeneral,
      error: errorGeneral,
      refetch: refetchGeneralOrders,
  } = useQuery<MappedOrder[], AxiosError>({
      queryKey: ['orders', 'generalDelivery'],
      queryFn: async () => {
          const response = await apiClient.get("/orders/");
          const data = Array.isArray(response.data) ? response.data : [];
          return data;
      },
      select: (data) => {
          return data
              .filter(order => order.order_type === "delivery" && order.status !== 'paid')
              .map(mapOrderData)
              .sort((a, b) => b.updatedTimestamp.getTime() - a.updatedTimestamp.getTime());
      },
      enabled: isClient && !!token,
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // <-- Har 10 soniyada avtomatik yangilash
  });

  // 2. To'langan yetkazib berish buyurtmalarini olish
  const {
      data: paidDeliveryOrders = [],
      isLoading: isLoadingPaid,
      isError: isErrorPaid,
      error: errorPaid,
      refetch: refetchPaidOrders,
  } = useQuery<MappedOrder[], AxiosError>({
      queryKey: ['orders', 'paidDelivery'],
      queryFn: async () => {
          const response = await apiClient.get("/delivery/paid-orders/");
          const data = Array.isArray(response.data) ? response.data : [];
          return data.map(mapOrderData)
                    .sort((a, b) => (b.paidAt?.getTime() || 0) - (a.paidAt?.getTime() || 0));
      },
      enabled: isClient && !!token,
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // <-- Har 10 soniyada avtomatik yangilash
  });


  // ----- React Query Mutatsiyalari (`useMutation`) -----

  // 1. Yetkazishni Boshlash Mutatsiyasi
  const startDeliveryMutation = useMutation<any, AxiosError, number>({
      mutationFn: (orderId) => apiClient.post(`/orders/${orderId}/start_delivery/`, {}),
      onSuccess: (data, orderId) => {
          toast.success(`Buyurtma #${orderId} yetkazish boshlandi!`);
          // Queryni invalidatsiya qilish orqali yangilash
          queryClient.invalidateQueries({ queryKey: ['orders', 'generalDelivery'] });
          setActiveTab("delivering");
      },
      onError: (error, orderId) => {
          handleApiError(error, `Buyurtma #${orderId} yetkazishni boshlash`);
      },
  });

  // 2. Yetkazishni Yakunlash Mutatsiyasi
  const completeDeliveryMutation = useMutation<any, AxiosError, number>({
      mutationFn: (orderId) => apiClient.post(`/orders/${orderId}/mark_delivered/`, {}),
      onSuccess: (data, orderId) => {
          toast.success(`Buyurtma #${orderId} yetkazildi deb belgilandi!`);
          queryClient.invalidateQueries({ queryKey: ['orders', 'generalDelivery'] });
          setActiveTab("delivered");
      },
      onError: (error, orderId) => {
          handleApiError(error, `Buyurtma #${orderId} yetkazishni yakunlash`);
      },
  });

  // 3. To'lovni Qayd Etish Mutatsiyasi
  interface PaymentPayload { method: string; received_amount?: number; }
  interface ProcessPaymentVariables { orderId: number; payload: PaymentPayload; }

  const processPaymentMutation = useMutation<any, AxiosError, ProcessPaymentVariables>({
      mutationFn: ({ orderId, payload }) => apiClient.post(`/orders/${orderId}/process_payment/`, payload),
      onSuccess: (data, variables) => {
          toast.success(`Buyurtma #${variables.orderId} uchun to'lov muvaffaqiyatli qayd etildi!`);
          setShowPaymentDialog(false);
          setSelectedOrder(null);

          // Ikkala queryni ham invalidatsiya qilish (darhol yangilash uchun)
          queryClient.invalidateQueries({ queryKey: ['orders', 'generalDelivery'] });
          queryClient.invalidateQueries({ queryKey: ['orders', 'paidDelivery'] });

          setActiveTab("paid");
      },
      onError: (error, variables) => {
          handleApiError(error, `Buyurtma #${variables.orderId} uchun to'lovni qayd etish`);
      },
  });

  // ----- Event Handlerlar -----

  const handleStartDelivery = (orderId: number) => {
      if (startDeliveryMutation.isPending) return;
      startDeliveryMutation.mutate(orderId);
  };

  const handleCompleteDeliveryClick = (order: MappedOrder) => {
      if (!order || completeDeliveryMutation.isPending) return;
      completeDeliveryMutation.mutate(order.id);
  }

  const handleViewOrderDetailsModal = (order: MappedOrder) => {
      setSelectedOrder(order);
      setShowOrderDetailsDialog(true);
  };

  const handleOpenPaymentDialog = (order: MappedOrder) => {
      if (!order || order.isPaid || processPaymentMutation.isPending) return;
      setSelectedOrder(order);
      setSelectedPaymentMethod("cash");
      setCashReceivedForPayment("");
      setShowPaymentDialog(true);
  };

  const handleProcessPayment = () => {
      if (!selectedOrder || processPaymentMutation.isPending) return;

      let payload: PaymentPayload = { method: selectedPaymentMethod };
      if (selectedPaymentMethod === "cash") {
          const received = parseFloat(cashReceivedForPayment);
          if (isNaN(received) || received < selectedOrder.total) {
              toast.error("Naqd pul uchun qabul qilingan summa noto'g'ri yoki yetarli emas!");
              return;
          }
          payload.received_amount = received;
      }

      processPaymentMutation.mutate({ orderId: selectedOrder.id, payload });
  };


  // ----- Yordamchi Funksiyalar -----

  const formatTimeOnly = (date: Date | null): string => {
      if (!(date instanceof Date) || isNaN(date.getTime())) return "N/A";
      return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  };

  const getTimeDifference = (date: Date | null): string => {
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

  const calculatePaymentChange = (): number => {
      if (selectedPaymentMethod !== 'cash' || !cashReceivedForPayment || !selectedOrder?.total) return 0;
      const received = parseFloat(cashReceivedForPayment);
      const total = selectedOrder.total;
      if (isNaN(received) || isNaN(total) || received < total) return 0;
      return received - total;
  }

  const handleLogout = () => {
      localStorage.removeItem("token");
      queryClient.clear();
      router.push("/auth");
      toast.info("Tizimdan chiqildi");
  };

  // ----- UI Render -----

  const isLoading = !isClient || (isLoadingGeneral && deliveryOrders.length === 0) || (isLoadingPaid && paidDeliveryOrders.length === 0); // Faqat boshlang'ich yuklanish
  const isError = isErrorGeneral || isErrorPaid;
  const errorObject = errorGeneral || errorPaid;

  // Boshlang'ich yuklanish ekrani
  if (isLoading && !isError) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
           <Loader2 className="animate-spin h-8 w-8 text-primary" />
           <span>Yuklanmoqda...</span>
         </div>
      </div>
    );
  }

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
        {/* Xatolik xabari (agar mavjud bo'lsa) */}
        {isError && ( // Faqat boshlang'ich yuklanishda xato bo'lsa ko'rsatish
            (isErrorGeneral && deliveryOrders.length === 0) || (isErrorPaid && paidDeliveryOrders.length === 0)
        ) && (
            <div className="mb-4 flex flex-col items-center justify-center rounded-md border border-destructive bg-destructive/10 p-4 text-center text-sm text-destructive">
                <p className="mb-2">Ma'lumotlarni yuklashda xatolik: {handleApiError(errorObject, "Ma'lumot yuklash", router)}</p>
                <Button variant="destructive" size="sm" onClick={() => {
                    if (isErrorGeneral) refetchGeneralOrders();
                    if (isErrorPaid) refetchPaidOrders();
                }}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Qayta urinish
                </Button>
            </div>
        )}

        {/* Tablar */}
        <Tabs defaultValue="ready" value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab List */}
          <div className="sticky top-[4px] bg-muted/10 pt-1 pb-2 z-10 -mx-4 px-4 border-b mb-4 flex justify-start backdrop-blur-sm">
             <TabsList className="grid w-full max-w-lg grid-cols-4">
                <TabsTrigger value="ready">Tayyor</TabsTrigger>
                <TabsTrigger value="delivering">Yetkazilmoqda</TabsTrigger>
                <TabsTrigger value="delivered">Yetkazildi</TabsTrigger>
                <TabsTrigger value="paid">To'langan</TabsTrigger>
             </TabsList>
          </div>

          {/* Tab Kontentlari */}
          {["ready", "delivering", "delivered", "paid"].map((tabValue) => {
            let currentOrdersList: MappedOrder[] = [];
            let isEmpty = true;
            let hasFetchError = false;

            if (tabValue === 'paid') {
                currentOrdersList = paidDeliveryOrders;
                isEmpty = !isLoadingPaid && currentOrdersList.length === 0;
                hasFetchError = isErrorPaid && currentOrdersList.length > 0; // Ma'lumot bor, lekin yangilashda xato
            } else {
                currentOrdersList = deliveryOrders.filter(order => order.status === tabValue);
                isEmpty = !isLoadingGeneral && currentOrdersList.length === 0;
                 hasFetchError = isErrorGeneral && currentOrdersList.length > 0; // Ma'lumot bor, lekin yangilashda xato
            }

            return (
              <TabsContent key={tabValue} value={tabValue} className="mt-4">
                {/* Bo'sh holat */}
                {isEmpty && !isError && (
                   <div className="col-span-full flex flex-col items-center justify-center h-60 rounded-md border border-dashed p-6 text-center text-muted-foreground">
                     {tabValue === "paid" ? <CheckCheck className="mb-3 h-12 w-12 text-gray-400" /> : <Truck className="mb-3 h-12 w-12 text-gray-400" />}
                     <h3 className="text-lg font-medium">
                       {/* ... bo'sh holat matnlari ... */}
                       {tabValue === "ready" && "Tayyor buyurtmalar yo'q"}
                       {tabValue === "delivering" && "Yetkazilayotgan buyurtmalar yo'q"}
                       {tabValue === "delivered" && "Yetkazilgan (to'lanmagan) buyurtmalar yo'q"}
                       {tabValue === "paid" && "To'langan buyurtmalar yo'q"}
                     </h3>
                     <p className="text-sm mt-1">
                        {/* ... bo'sh holat tavsiflari ... */}
                       {tabValue === "ready" && "Yangi buyurtmalar bu yerda ko'rinadi."}
                       {tabValue === "delivering" && "Yetkazish boshlanganda bu yerda ko'rinadi."}
                       {tabValue === "delivered" && "Mijozga topshirilgan, ammo to'lovi kutilayotganlar bu yerda ko'rinadi."}
                       {tabValue === "paid" && "To'lovi yakunlangan buyurtmalar bu yerda ko'rinadi."}
                     </p>
                   </div>
                 )}

                {/* Buyurtmalar ro'yxati */}
                {currentOrdersList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {currentOrdersList.map((order) => (
                            <Card key={order.id} className={`overflow-hidden flex flex-col h-full shadow-sm border ${order.isPaid ? 'border-green-300 bg-green-50/30 dark:bg-green-900/20' : ''}`}>
                                {/* Card Header va Content (avvalgidek) */}
                                 <CardHeader className="p-3 bg-muted/30 flex flex-row justify-between items-center space-y-0">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-sm font-semibold leading-none"> Buyurtma #{order.id} </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">
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
                                    } className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 whitespace-nowrap h-5 ${order.status === 'paid' ? 'bg-green-600 text-white dark:bg-green-700' : ''}`}>
                                        {order.status === 'ready' && <Clock className="h-2.5 w-2.5" />}
                                        {order.status === 'delivering' && <Truck className="h-2.5 w-2.5" />}
                                        {order.status === 'delivered' && <Check className="h-2.5 w-2.5" />}
                                        {order.status === 'paid' && <CheckCircle className="h-2.5 w-2.5" />}
                                        {order.status_display || order.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-3 flex-1 space-y-2 text-xs">
                                    <div className="space-y-1 border-b pb-2">
                                        <div className="flex items-center gap-1.5"> <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> <span className="font-medium truncate">{order.customer.name}</span> </div>
                                        <div className="flex items-center gap-1.5"> <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> <a href={`tel:${order.customer.phone}`} className="text-blue-600 hover:underline">{order.customer.phone}</a> </div>
                                        <div className="flex items-start gap-1.5"> <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-px" /> <span className="line-clamp-2">{order.customer.address}</span> </div>
                                    </div>
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
                                    <div className="space-y-0.5 pt-2 border-t">
                                        <div className="flex justify-between items-center"> <span className="text-muted-foreground">Jami summa:</span> <span className="font-semibold">{order.total.toLocaleString()} so'm</span> </div>
                                        <div className="flex justify-between items-center"> <span className="text-muted-foreground">To'lov:</span>
                                            {order.isPaid ? ( <Badge variant="success" className="text-[10px] px-1.5 py-0.5 h-5 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"> To'langan ({order.paymentMethodDisplay}) </Badge>
                                            ) : ( <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-5"> To'lanmagan </Badge> )}
                                        </div>
                                    </div>
                                </CardContent>
                                {/* Card Footer (avvalgidek, faqat disabled holati mutationga bog'landi) */}
                                <CardFooter className="flex items-center gap-2 border-t p-2 mt-auto">
                                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => handleViewOrderDetailsModal(order)}> <Info className="h-3.5 w-3.5 mr-1"/> Batafsil </Button>
                                    {order.status === "ready" && ( <Button variant="default" size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8" onClick={() => handleStartDelivery(order.id)} disabled={startDeliveryMutation.isPending}> {startDeliveryMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin"/> : <Truck className="h-3.5 w-3.5 mr-1"/>} Boshlash </Button> )}
                                    {order.status === "delivering" && ( <Button variant="primary" size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8" onClick={() => handleCompleteDeliveryClick(order)} disabled={completeDeliveryMutation.isPending}> {completeDeliveryMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin"/> : <Check className="h-3.5 w-3.5 mr-1"/>} Yetkazildi </Button> )}
                                    {order.status === "delivered" && !order.isPaid && order.total > 0 && ( <Button variant="success" size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-8" onClick={() => handleOpenPaymentDialog(order)} disabled={processPaymentMutation.isPending}> <CheckCircle className="h-3.5 w-3.5 mr-1"/> To'lovni Qayd etish </Button> )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
                {/* Yangilanishdagi xato */}
                {hasFetchError && (
                    <div className="mt-4 text-center text-xs text-destructive p-2 bg-destructive/10 rounded">
                        Ushbu bo'limni yangilashda xatolik yuz berdi. Internet aloqasini tekshiring.
                        <Button variant="link" size="sm" className="text-xs h-auto p-0 ml-1 text-destructive underline" onClick={() => {
                            if (tabValue === 'paid') refetchPaidOrders();
                            else refetchGeneralOrders();
                        }}>(Qayta urinish)</Button>
                    </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Modal (Batafsil ko'rish uchun) - O'zgarishsiz */}
      {selectedOrder && showOrderDetailsDialog && (
        <Dialog open={showOrderDetailsDialog} onOpenChange={setShowOrderDetailsDialog}>
           {/* ... modal content ... */}
           <DialogContent className="sm:max-w-md">
             <DialogHeader>
               <DialogTitle>Buyurtma #{selectedOrder.id} (Batafsil)</DialogTitle>
               <DialogDescription>
                 {formatTimeOnly(selectedOrder.timestamp)} da qabul qilingan
               </DialogDescription>
             </DialogHeader>
             <ScrollArea className="max-h-[60vh] py-4 pr-3">
                <div className="space-y-4 text-sm">
                 <div className="space-y-1">
                   <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mijoz</h3>
                   <div className="space-y-1 border p-2 rounded-md bg-muted/30">
                       <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/><span>{selectedOrder.customer.name}</span></div>
                       <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/><span>{selectedOrder.customer.phone}</span></div>
                       <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5"/><span>{selectedOrder.customer.address}</span></div>
                   </div>
                 </div>
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
                            {selectedOrder.paidAt && <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t mt-1"><span>Vaqti:</span><span>{selectedOrder.paidAt.toLocaleString('uz-UZ')}</span></div>}
                            {selectedOrder.payment.processed_by_name && <div className="flex justify-between text-xs text-muted-foreground"><span>Kassir:</span><span>{selectedOrder.payment.processed_by_name}</span></div>}
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

      {/* Yangi To'lov Modali - O'zgarishsiz */}
      {selectedOrder && showPaymentDialog && (
         <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            {/* ... payment modal content ... */}
            <DialogContent className="sm:max-w-lg">
             <DialogHeader>
               <DialogTitle>Buyurtma #{selectedOrder.id} uchun To'lov</DialogTitle>
               <DialogDescription>
                 To'lov usulini tanlang va kerakli ma'lumotlarni kiriting.
               </DialogDescription>
             </DialogHeader>
             <div className="py-4 space-y-4">
               <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                 <span className="text-sm font-medium text-muted-foreground">To'lanishi kerak:</span>
                 <span className="text-lg font-bold">{selectedOrder.total.toLocaleString()} so'm</span>
               </div>
               <div className="space-y-2">
                 <Label className="text-sm font-medium">To'lov usuli</Label>
                 <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} className="grid grid-cols-3 gap-4">
                   {[ { value: 'cash', label: 'Naqd', icon: DollarSign },
                      { value: 'card', label: 'Karta', icon: CreditCard },
                      { value: 'mobile', label: 'Mobil', icon: Smartphone } ].map((item) => (
                     <Label
                       key={item.value}
                       htmlFor={`payment-${item.value}`}
                       className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${selectedPaymentMethod === item.value ? 'border-primary' : ''} ${processPaymentMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       <RadioGroupItem value={item.value} id={`payment-${item.value}`} className="sr-only" disabled={processPaymentMutation.isPending} />
                       <item.icon className="mb-3 h-6 w-6" />
                       {item.label}
                     </Label>
                   ))}
                 </RadioGroup>
               </div>
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
                           disabled={processPaymentMutation.isPending}
                       />
                   </div>
                    {parseFloat(cashReceivedForPayment) >= selectedOrder.total && (
                     <div className="flex justify-between items-center p-2 bg-green-100 rounded-md dark:bg-green-900/50">
                         <span className="text-sm font-medium text-green-800 dark:text-green-300">Qaytim:</span>
                         <span className="text-sm font-bold text-green-800 dark:text-green-300">{calculatePaymentChange().toLocaleString()} so'm</span>
                     </div>
                    )}
                 </div>
               )}
               {processPaymentMutation.isError && (
                   <p className="text-sm text-destructive text-center">
                       To'lovni qayd etishda xatolik: {handleApiError(processPaymentMutation.error, "To'lovni qayd etish")}
                   </p>
               )}
             </div>
             <DialogFooter>
               <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={processPaymentMutation.isPending}>
                 <XCircle className="h-4 w-4 mr-1"/> Bekor qilish
               </Button>
               <Button
                 onClick={handleProcessPayment}
                 disabled={processPaymentMutation.isPending || (selectedPaymentMethod === 'cash' && (!cashReceivedForPayment || parseFloat(cashReceivedForPayment) < selectedOrder.total))}
               >
                 {processPaymentMutation.isPending ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 ) : (
                     <CheckCircle className="h-4 w-4 mr-1"/>
                 )}
                 {processPaymentMutation.isPending ? "Qayta ishlanmoqda..." : "To'lovni Tasdiqlash"}
               </Button>
             </DialogFooter>
           </DialogContent>
        </Dialog>
      )}

    </div>
  );
}