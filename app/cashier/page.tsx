"use client"

// React va kerakli hooklar
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// React Query
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query"
// Axios
import axios, { AxiosError } from "axios"
// Ikonkalar
import {
  ArrowLeft, CreditCard, DollarSign, LogOut, Printer, Receipt, ShoppingCart, Smartphone, X,
  Loader2, AlertTriangle, RotateCcw
} from "lucide-react"
// Shadcn/ui komponentlar
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Toastify
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// ----- TypeScript Interfeyslari -----
interface ProductDetails { name: string; image_url?: string; }
interface OrderItem { id: number; product_details?: ProductDetails; quantity: number; unit_price: string | number; total_price: string | number; product: number; }
interface TableInfo { name: string; zone?: string; }
interface PaymentInfo { id: number; method: string; method_display: string; timestamp: string; processed_by_name?: string; received_amount?: string | number; change_amount?: string | number; mobile_provider?: string; }
interface Order {
  id: number;
  status: string;
  status_display: string;
  order_type: 'delivery' | 'takeaway' | 'dine-in';
  order_type_display: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  created_at: string;
  updated_at?: string;
  table?: TableInfo | null;
  table_id?: number | null;
  final_price: string | number;
  items: OrderItem[];
  service_fee_percent?: number;
  service_fee_amount?: string | number;
  tax_percent?: number;
  tax_amount?: string | number;
  payment?: PaymentInfo | null;
}
interface ReceiptData {
  restaurant_name?: string;
  restaurant_address?: string;
  restaurant_phone?: string;
  restaurant_inn?: string;
  cashier_name?: string;
  payment_time?: string;
  check_number?: string;
  order_type_display?: string;
  items: Array<{
    product_name?: string;
    quantity?: number;
    unit_price?: string | number;
    total_item_price?: string | number;
  }>;
  subtotal?: string | number;
  service_fee_percent?: string | number;
  service_fee_amount?: string | number;
  tax_percent?: string | number;
  tax_amount?: string | number;
  final_price?: string | number;
  payment_method_display?: string;
  received_amount?: string | number;
  change_amount?: string | number;
}

// ----- API Konfiguratsiyasi va Funksiyalari -----

const API_BASE_URL = "https://oshxonacopy.pythonanywhere.com/api"

// Axios instance
const apiClient = axios.create({ baseURL: API_BASE_URL })

// Token olish funksiyasi
const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }
  return null
}

// Axios interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.headers) {
      config.headers["Content-Type"] = "application/json"
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Xatoliklarni qayta ishlash
const handleApiError = (
  error: unknown, context: string, router: ReturnType<typeof useRouter>, queryClientInstance: QueryClient
) => {
  console.error(`${context} xatosi:`, error);
  let errorMessage = `Noma'lum xatolik (${context})`;
  if (error instanceof AxiosError) {
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = "Sessiya muddati tugagan yoki avtorizatsiya xatosi.";
        // Agar refetch interval aktiv bo'lsa, bir martalik xatodan keyin qayta-qayta auth sahifasiga yo'naltirmaslik uchun ehtiyot bo'lish kerak.
        // Tokenni o'chirish va querylarni tozalash yetarli bo'lishi mumkin.
        if (localStorage.getItem("token")) { // Faqat token mavjud bo'lsa xabar beramiz va o'chiramiz
            localStorage.removeItem("token");
            queryClientInstance.removeQueries();
            toast.error(errorMessage + " Iltimos, qayta kiring.");
            router.push("/auth"); // push o'rniga replace ishlatsa ham bo'ladi
        }
        return errorMessage;
      }
      errorMessage = error.response.data?.detail || error.response.data?.message || `Server xatosi (${error.response.status})`;
    } else if (error.request) { errorMessage = "Server bilan bog'lanishda xatolik."; }
    else { errorMessage = error.message || "So'rovni yuborishda xatolik."; }
  }
  // Qayta-qayta bir xil xatoni ko'rsatmaslik uchun throttle yoki debounce qo'shish mumkin, ammo hozircha oddiy toast
  toast.error(`${context}: ${errorMessage}`);
  return errorMessage;
};

// --- Query Funksiyalari ---
/** To'lovga tayyor buyurtmalarni oladi */
const fetchReadyOrders = async (router: ReturnType<typeof useRouter>, queryClientInstance: QueryClient): Promise<Order[]> => {
  try {
    const res = await apiClient.get<Order[]>("/cashier/orders-ready/")
    // console.log("Tayyor buyurtmalar API javobi:", res.data); // Interval bilan ko'p log chiqarmaslik uchun commentga olamiz
    return res.data || []
  } catch (error) {
    handleApiError(error, "Tayyor buyurtmalarni yuklash", router, queryClientInstance);
    throw error;
  }
}

/** To'langan buyurtmalar tarixini oladi */
const fetchPaymentHistory = async (router: ReturnType<typeof useRouter>, queryClientInstance: QueryClient): Promise<Order[]> => {
  try {
    const res = await apiClient.get<Order[]>("/cashier/payment-history/")
    // console.log("To'lov tarixi API javobi:", res.data); // Interval bilan ko'p log chiqarmaslik uchun commentga olamiz
    const sortedHistory = (res.data || []).sort(
      (a, b) =>
        new Date(b.payment?.timestamp || b.updated_at || 0).getTime() -
        new Date(a.payment?.timestamp || a.updated_at || 0).getTime()
    );
    return sortedHistory;
  } catch (error) {
    handleApiError(error, "To'lov tarixini yuklash", router, queryClientInstance);
    throw error;
  }
}

/** Chek ma'lumotlarini oladi */
const fetchReceipt = async (orderId: number): Promise<ReceiptData> => {
  const { data } = await apiClient.get<ReceiptData>(`/orders/${orderId}/receipt/`);
  console.log("Chek API javobi:", data);
  if (!data) throw new Error("API dan bo'sh chek javobi qaytdi");
  return data;
}

// --- Mutation Funksiyalari ---
/** To'lovni qayta ishlaydi */
interface PaymentPayload {
  method: 'cash' | 'card' | 'mobile';
  received_amount?: number;
  mobile_provider?: string;
}
const processPayment = async ({ orderId, paymentData }: { orderId: number; paymentData: PaymentPayload }): Promise<PaymentInfo> => {
  const { data } = await apiClient.post<PaymentInfo>(`/orders/${orderId}/process_payment/`, paymentData)
  console.log("To'lov API javobi:", data);
  if (!data) throw new Error("API dan bo'sh to'lov javobi qaytdi");
  return data;
}


// ==========================================================================
// Kassa Sahifasi Komponenti (CashierPage)
// ==========================================================================
export default function CashierPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [isClient, setIsClient] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [viewingOrderDetails, setViewingOrderDetails] = useState<Order | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>("cash")
  const [cashReceived, setCashReceived] = useState("")
  const [selectedMobileProvider, setSelectedMobileProvider] = useState("")
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [isReceiptLoading, setIsReceiptLoading] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [receiptOrderId, setReceiptOrderId] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      const token = getToken()
      if (!token) {
        // Bu yerda qayta yo'naltirishni faqat bir marta qilish muhim,
        // handleApiError ichidagi 401 tekshiruvi interval tufayli qayta-qayta ishlashi mumkin.
        // Agar token yo'q bo'lsa, querylar enabled=false bo'ladi va 401 xato kelmaydi.
        toast.error("Sessiya topilmadi. Iltimos, qayta kiring.")
        queryClient.removeQueries();
        router.replace("/auth")
      }
    }
  }, [router, queryClient, isClient])

  // --- React Query Hooks ---
  /** Tayyor buyurtmalarni olish */
  const {
    data: readyOrders = [],
    isLoading: isLoadingOrders,
    isError: isErrorOrders,
    error: errorOrdersObj,
    refetch: refetchReadyOrders,
  } = useQuery<Order[], AxiosError>({
    queryKey: ['orders', 'ready'],
    queryFn: () => fetchReadyOrders(router, queryClient),
    enabled: isClient && !!getToken(), // Faqat clientda va token bo'lganda ishga tushirish
    // === YANGILANISH: Har 10 soniyada avtomatik qayta yuklash ===
    refetchInterval: 10000, // 10000 millisekund = 10 soniya
    refetchOnWindowFocus: true, // Brauzer oynasiga qaytganda ham yangilash (ixtiyoriy, lekin odatda kerak)
  })

  /** To'lov tarixini olish */
  const {
    data: paymentHistory = [],
    isLoading: isLoadingHistory,
    isError: isErrorHistory,
    error: errorHistoryObj,
    refetch: refetchPaymentHistory,
  } = useQuery<Order[], AxiosError>({
    queryKey: ['orders', 'history'],
    queryFn: () => fetchPaymentHistory(router, queryClient),
    enabled: isClient && !!getToken(), // Faqat clientda va token bo'lganda ishga tushirish
    // === YANGILANISH: Har 10 soniyada avtomatik qayta yuklash ===
    refetchInterval: 10000, // 10000 millisekund = 10 soniya
    refetchOnWindowFocus: true, // Brauzer oynasiga qaytganda ham yangilash (ixtiyoriy)
  })

  // --- React Query Mutation ---
  const paymentMutation = useMutation<PaymentInfo, AxiosError, { orderId: number; paymentData: PaymentPayload }>({
    mutationFn: processPayment,
    onSuccess: (paymentInfo, variables) => {
      toast.success(`Buyurtma #${variables.orderId} to'lovi muvaffaqiyatli!`);
      setShowPaymentDialog(false);
      setPaymentError("");
      setCashReceived("");
      setSelectedMobileProvider("");
      setPaymentMethod("cash");

      // Muhim: Querylarni darhol yangilash (intervalni kutmasdan)
      queryClient.invalidateQueries({ queryKey: ['orders', 'ready'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'history'] });

      fetchReceiptDataInternal(variables.orderId);
    },
    onError: (error, variables) => {
      const errorMsg = handleApiError(error, `Buyurtma #${variables.orderId} uchun to'lov`, router, queryClient);
      setPaymentError(errorMsg || "Noma'lum to'lov xatosi");
    },
  });


  // --- Yordamchi Funksiyalar ---

  /** Sanani formatlash */
  const formatTime = (dateString: string | undefined): string => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Noto'g'ri sana"
      // toLocaleString hydration muammolarini keltirib chiqarmasligi uchun isClient tekshiruvi
      // bilan himoyalangan, shuning uchun bu yerda qo'shimcha tekshiruv shart emas.
      return date.toLocaleString("uz-UZ", {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } catch (e) { console.error("Sana formatlashda xato:", e, dateString); return "Xatolik"; }
  }

  /** Qaytimni hisoblash */
  const calculateChange = (): number => {
    if (paymentMethod !== "cash" || !cashReceived || !selectedOrder?.final_price) return 0;
    const received = parseFloat(cashReceived);
    const price = parseFloat(String(selectedOrder.final_price));
    if (isNaN(received) || isNaN(price) || received < price) return 0;
    return received - price;
  }

  // --- Event Handlerlar ---

  const handleSelectOrderForPayment = (order: Order) => {
    setSelectedOrder(order);
    setShowPaymentDialog(false);
    setPaymentMethod("cash");
    setCashReceived("");
    setSelectedMobileProvider("");
    setPaymentError("");
    setShowReceiptDialog(false);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptOrderId(null);
    setViewingOrderDetails(null);
    setShowDetailsDialog(false);
  }

  const handleViewHistoryDetails = (order: Order) => {
    setViewingOrderDetails(order);
    setShowDetailsDialog(true);
    setSelectedOrder(order);
    setShowPaymentDialog(false);
    setShowReceiptDialog(false);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptOrderId(null);
  }

  const handlePayment = () => {
    if (!selectedOrder) {
      toast.warn("Iltimos, avval to'lov uchun buyurtmani tanlang");
      return;
    }
    if (selectedOrder.payment) {
      toast.info(`Buyurtma #${selectedOrder.id} allaqachon to'langan.`);
      fetchReceiptDataInternal(selectedOrder.id);
    } else {
      setPaymentError("");
      setPaymentMethod("cash");
      setCashReceived("");
      setSelectedMobileProvider("");
      setShowPaymentDialog(true);
    }
  }

  const fetchReceiptDataInternal = async (orderId: number | null) => {
    if (!orderId) return;
    if (isReceiptLoading && receiptOrderId === orderId) return;

    console.log(`Buyurtma #${orderId} uchun chek ma'lumotlari yuklanmoqda...`);
    setIsReceiptLoading(true);
    setReceiptError(null);
    setReceiptData(null);
    setReceiptOrderId(orderId);
    setShowReceiptDialog(true);

    try {
      const data = await fetchReceipt(orderId);
      setReceiptData(data);
      setReceiptError(null);
    } catch (err) {
      console.error(`Buyurtma #${orderId} uchun chek yuklash xatosi:`, err);
      let errorMsg = `Chek yuklashda xatolik (${orderId}).`;
      if (err instanceof AxiosError && err.response) {
        const { status, data } = err.response;
        if (status === 404) errorMsg = `Buyurtma #${orderId} topilmadi yoki chek mavjud emas.`;
        else if (status === 401) errorMsg = "Avtorizatsiya xatosi.";
        else if (status === 403) errorMsg = "Chekni ko'rishga ruxsat yo'q.";
        else errorMsg = data?.detail || `Server xatosi (${status}).`;
      } else if (err instanceof Error) { errorMsg = err.message; }
      setReceiptError(errorMsg);
      setReceiptData(null);
      toast.error(errorMsg);
    } finally {
      setIsReceiptLoading(false);
    }
  };

  const handleCompletePayment = () => {
    if (!selectedOrder) return;
    setPaymentError("");

    const finalPrice = parseFloat(String(selectedOrder.final_price || 0));
    const received = parseFloat(cashReceived);

    if (!paymentMethod || !["cash", "card", "mobile"].includes(paymentMethod)) {
      setPaymentError("Iltimos, to'g'ri to'lov usulini tanlang."); return;
    }
    if (paymentMethod === "mobile" && !selectedMobileProvider) {
      setPaymentError("Mobil to'lov uchun provayderni tanlang."); return;
    }
    if (paymentMethod === "cash" && (isNaN(received) || received <= 0)) {
      setPaymentError("Iltimos, qabul qilingan naqd summani kiriting."); return;
    }
    if (paymentMethod === "cash" && received < finalPrice) {
      setPaymentError(`Qabul qilingan summa jami summadan kam bo'lishi mumkin emas.`); return;
    }

    const paymentData: PaymentPayload = {
      method: paymentMethod,
      ...(paymentMethod === "cash" && { received_amount: received }),
      ...(paymentMethod === "mobile" && { mobile_provider: selectedMobileProvider }),
    };

    paymentMutation.mutate({ orderId: selectedOrder.id, paymentData });
  }

  const handlePrintAndCloseReceipt = () => {
    if (!receiptData || !receiptOrderId) {
      toast.error("Chop etish uchun chek ma'lumotlari topilmadi.");
      return;
    }
    const orderIdForToast = receiptOrderId;
    console.log(`Buyurtma #${orderIdForToast} uchun chek chop etish simulyatsiyasi`);
    toast.info(`Buyurtma #${orderIdForToast} uchun chek chop etildi (simulyatsiya).`);
    // window.print(); // Haqiqiy print

    setShowReceiptDialog(false);
    setReceiptData(null);
    setReceiptError(null);
    setReceiptOrderId(null);
    setSelectedOrder(null);

    setCashReceived("")
    setSelectedMobileProvider("")
    setPaymentMethod("cash")

    // Ma'lumotlar interval bilan yangilanib turganligi uchun,
    // query cache dan olish ishonchliroq bo'lishi mumkin.
    const historyCache = queryClient.getQueryData<Order[]>(['orders', 'history']);
    const justPaidOrder = historyCache?.find(o => o.id === orderIdForToast);
    if (justPaidOrder?.order_type === "dine_in") {
      toast.info(`Stol ${justPaidOrder.table?.name || justPaidOrder.table_id || "?"} endi bo'sh`, { autoClose: 4000 });
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    queryClient.removeQueries();
    router.replace("/auth");
    toast.info("Tizimdan muvaffaqiyatli chiqildi");
  }

  // --- UI Render ---

  // Yuklanish holati (hydration fix bilan birga)
  // isLoadingOrders va isLoadingHistory endi birinchi fetch uchun ishlaydi,
  // interval bilan keyingi fetchlar fonda amalga oshiriladi (agar backgroundFetch aktiv bo'lsa)
  // yoki sahifa aktiv bo'lganda. Shuning uchun bu loader faqat boshlang'ich yuklanishda ko'rinadi.
  if (!isClient || (isLoadingOrders && readyOrders.length === 0) || (isLoadingHistory && paymentHistory.length === 0)) {
     // Agar ma'lumotlar allaqachon mavjud bo'lsa (keshdan), loader ko'rsatmaymiz
     // Faqat `isClient` false bo'lsa yoki hech qanday ma'lumot yo'q va yuklanayotgan bo'lsa loader ko'rsatiladi.
    return (
      <div className="flex h-screen items-center justify-center bg-muted/40">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <span>Ma'lumotlar yuklanmoqda...</span>
        </div>
      </div>
    )
  }

  // Asosiy Kontent
  return (
    <div className="flex h-screen flex-col bg-muted/40">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />

      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="icon" className="shrink-0" title="Ortga (POS)" onClick={() => router.push("/pos")}>
            <ArrowLeft className="h-5 w-5" /> <span className="sr-only">Ortga (POS)</span>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold">Kassa</h1>
        </div>
        {/* Headerga kichik loading indikator qo'shish mumkin (agar interval bilan fetch bo'layotganini ko'rsatish kerak bo'lsa) */}
        {/* Masalan: {queryClient.isFetching(['orders', 'ready']) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />} */}
        <Button variant="outline" size="icon" className="shrink-0" onClick={handleLogout} title="Chiqish">
          <LogOut className="h-5 w-5" /> <span className="sr-only">Chiqish</span>
        </Button>
      </header>

      {/* Asosiy Kontent */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden">
        {/* Chap ustun: Buyurtmalar ro'yxati */}
        <div className="md:col-span-1 border-r border-border flex flex-col overflow-hidden bg-background">
          <Tabs defaultValue="ready-orders" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 shrink-0 h-11 border-b bg-background z-10">
              <TabsTrigger value="ready-orders" className="text-xs sm:text-sm relative">
                Tayyor ({readyOrders.length})
                       </TabsTrigger>
              <TabsTrigger value="payment-history" className="text-xs sm:text-sm relative">
                Tarix ({paymentHistory.length})
          
              </TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-hidden">
              {/* Tayyor buyurtmalar */}
              <TabsContent value="ready-orders" className="h-full overflow-hidden mt-0 p-0">
                <ScrollArea className="h-full p-2 sm:p-4">
                  {/* Boshlang'ich yuklanishdagi xato */}
                  {isErrorOrders && readyOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                      <AlertTriangle className="mb-3 h-10 w-10" />
                      <p className="mb-2 font-medium">Tayyor buyurtmalarni yuklashda xatolik!</p>
                      <p className="text-xs mb-3">{errorOrdersObj?.message || "Noma'lum xato"}</p>
                      <Button size="sm" onClick={() => refetchReadyOrders()}> <RotateCcw className="mr-2 h-3 w-3" /> Qayta yuklash </Button>
                    </div>
                  ) : readyOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                      <ShoppingCart className="mb-3 h-12 w-12 text-gray-400" />
                      <h3 className="text-base sm:text-lg font-medium">Tayyor buyurtmalar yo'q</h3>
                      <p className="text-xs sm:text-sm mt-1">Yangi buyurtmalar bu yerda ko'rinadi.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {readyOrders.map((order) => (
                        <Card key={`ready-${order.id}`}
                          className={`cursor-pointer hover:shadow-md transition-all rounded-lg border ${selectedOrder?.id === order.id && !selectedOrder.payment ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border hover:border-muted-foreground/50"}`}
                          onClick={() => handleSelectOrderForPayment(order)}>
                          <CardHeader className="p-3 sm:p-4 pb-2">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                                {order.order_type_display || "Noma'lum"}
                                {order.order_type === "dine_in" && ` - ${order.table?.name ? `Stol ${order.table.name}` : "Stol"}`}
                              </CardTitle>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 whitespace-nowrap">#{order.id}</Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                              {order.customer_name && <p className="truncate" title={order.customer_name}>{order.customer_name}</p>}
                              <p>Yaratildi: {formatTime(order.created_at)}</p>
                            </div>
                          </CardHeader>
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="flex items-center space-x-1 px-3 pt-0 pb-2 overflow-x-auto scrollbar-hide">
                              {order.items.slice(0, 5).map((item) => (
                                <img key={item.id || `img-${item.product}`} src={item.product_details?.image_url || "/placeholder-product.jpg"} alt={item.product_details?.name || ""} className="h-8 w-8 rounded-md object-cover border flex-shrink-0" title={item.product_details?.name || ""} onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }} loading="lazy" />
                              ))}
                              {order.items.length > 5 && (<div className="h-8 w-8 rounded-md border bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">+{order.items.length - 5}</div>)}
                            </div>
                          )}
                          <CardFooter className="p-3 sm:p-4 pt-1 sm:pt-2 flex justify-between items-center">
                            <div className="text-xs sm:text-sm text-muted-foreground">{Array.isArray(order.items) ? `${order.items.length} mahsulot` : "0 mahsulot"}</div>
                            <div className="font-semibold text-sm sm:text-base">{parseFloat(String(order.final_price || 0)).toLocaleString()} so'm</div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                  {/* Keyingi yuklashlardagi xato (agar toast yetarli bo'lmasa) */}
                  {isErrorOrders && readyOrders.length > 0 && (
                      <div className="mt-4 text-center text-xs text-destructive p-2 bg-destructive/10 rounded">
                          Tayyor buyurtmalarni yangilashda xatolik yuz berdi. ({errorOrdersObj?.message})
                      </div>
                  )}
                </ScrollArea>
              </TabsContent>
              {/* To'lov tarixi */}
              <TabsContent value="payment-history" className="h-full overflow-hidden mt-0 p-0">
                <ScrollArea className="h-full p-2 sm:p-4">
                   {/* Boshlang'ich yuklanishdagi xato */}
                  {isErrorHistory && paymentHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-destructive p-4">
                      <AlertTriangle className="mb-3 h-10 w-10" />
                      <p className="mb-2 font-medium">To'lov tarixini yuklashda xatolik!</p>
                      <p className="text-xs mb-3">{errorHistoryObj?.message || "Noma'lum xato"}</p>
                      <Button size="sm" onClick={() => refetchPaymentHistory()}> <RotateCcw className="mr-2 h-3 w-3" /> Qayta yuklash </Button>
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
                        <Card key={`history-${order.id}`}
                          className="hover:shadow-md transition-colors rounded-lg border border-border hover:border-muted-foreground/50 cursor-pointer"
                          onClick={() => handleViewHistoryDetails(order)}>
                          <CardHeader className="p-3 sm:p-4 pb-2">
                            <div className="flex justify-between items-start gap-2">
                              <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                                {order.order_type_display || "Noma'lum"}
                                {order.order_type === "dine_in" && ` - ${order.table?.name ? `Stol ${order.table.name}` : "Stol"}`}
                              </CardTitle>
                              <Badge variant="success" className="text-xs px-1.5 py-0.5 whitespace-nowrap">#{order.id} (To'langan)</Badge>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground mt-1 space-y-0.5">
                              {order.customer_name && <p className="truncate" title={order.customer_name}>{order.customer_name}</p>}
                              <p>To'landi: {formatTime(order.payment?.timestamp || order.updated_at)}</p>
                              <p>Usul: <span className="capitalize">{order.payment?.method_display || order.payment?.method || "N/A"}</span></p>
                            </div>
                          </CardHeader>
                          {Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="flex items-center space-x-1 px-3 pt-0 pb-2 overflow-x-auto scrollbar-hide">
                              {order.items.slice(0, 5).map((item) => (
                                <img key={item.id || `hist-img-${item.product}`} src={item.product_details?.image_url || "/placeholder-product.jpg"} alt={item.product_details?.name || ""} className="h-8 w-8 rounded-md object-cover border flex-shrink-0" title={item.product_details?.name || ""} onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }} loading="lazy" />
                              ))}
                              {order.items.length > 5 && (<div className="h-8 w-8 rounded-md border bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">+{order.items.length - 5}</div>)}
                            </div>
                          )}
                          <CardFooter className="p-3 sm:p-4 pt-1 sm:pt-2 flex justify-between items-center">
                            <div className="text-xs sm:text-sm text-muted-foreground">{Array.isArray(order.items) ? `${order.items.length} mahsulot` : "0 mahsulot"}</div>
                            <div className="font-semibold text-sm sm:text-base">{parseFloat(String(order.final_price || 0)).toLocaleString()} so'm</div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  )}
                  {/* Keyingi yuklashlardagi xato (agar toast yetarli bo'lmasa) */}
                   {isErrorHistory && paymentHistory.length > 0 && (
                      <div className="mt-4 text-center text-xs text-destructive p-2 bg-destructive/10 rounded">
                          To'lov tarixini yangilashda xatolik yuz berdi. ({errorHistoryObj?.message})
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
              {/* ... (O'ng ustun kodi o'zgarishsiz qoladi) ... */}
              <div className="p-4 border-b border-border shrink-0 h-16 flex justify-between items-center gap-4">
                <h2 className="text-base sm:text-lg font-semibold truncate">{selectedOrder.order_type_display || "Buyurtma"}</h2>
                <div className="flex items-center gap-2">
                  {selectedOrder.order_type === "dine_in" && <Badge variant="outline" className="whitespace-nowrap">Stol {selectedOrder.table?.name || selectedOrder.table_id || "?"}</Badge>}
                  <Badge variant="outline" className="whitespace-nowrap">ID: #{selectedOrder.id}</Badge>
                  {selectedOrder.payment && <Badge variant="success" className="whitespace-nowrap">To'langan</Badge>}
                </div>
              </div>
              {selectedOrder.customer_name && (<div className="px-4 pt-2 pb-1 border-b border-border shrink-0 text-xs sm:text-sm text-muted-foreground"> <span>Mijoz: {selectedOrder.customer_name}</span> {selectedOrder.customer_phone && <span> - {selectedOrder.customer_phone}</span>} </div>)}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <div key={item.id || `item-${item.product}`} className="flex justify-between items-center gap-2 border-b border-border pb-3 last:border-0">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-md overflow-hidden bg-muted"> <img src={item.product_details?.image_url || "/placeholder-product.jpg"} alt={item.product_details?.name || "Mahsulot"} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }} /> </div>
                          <div className="flex-grow min-w-0"> <p className="font-medium text-sm sm:text-base truncate" title={item.product_details?.name || "Noma'lum"}>{item.product_details?.name || "Noma'lum mahsulot"}</p> <p className="text-xs text-muted-foreground">{parseFloat(String(item.unit_price || 0)).toLocaleString()} so'm</p> </div>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">x{item.quantity || 0}</Badge>
                        </div>
                        <div className="text-right font-semibold text-sm sm:text-base w-24 shrink-0">{parseFloat(String(item.total_price || 0)).toLocaleString()} so'm</div>
                      </div>
                    ))
                  ) : (<div className="text-center text-muted-foreground py-10">Buyurtma elementlari topilmadi.</div>)}
                </div>
              </ScrollArea>
              <div className="border-t border-border p-4 shrink-0 bg-muted/20">
                <div className="space-y-1 mb-4 text-sm sm:text-base">
                  <div className="flex justify-between text-xs text-muted-foreground"> <span>Mahsulotlar jami:</span> <span>{selectedOrder.items?.reduce((sum, i) => sum + parseFloat(String(i.total_price || 0)), 0).toLocaleString()} so'm</span> </div>
                  {Number(selectedOrder.service_fee_amount || 0) > 0 && (<div className="flex justify-between text-xs text-muted-foreground"> <span>Xizmat haqi ({selectedOrder.service_fee_percent || 0}%):</span> <span>+ {parseFloat(String(selectedOrder.service_fee_amount)).toLocaleString()} so'm</span> </div>)}
                  {Number(selectedOrder.tax_amount || 0) > 0 && (<div className="flex justify-between text-xs text-muted-foreground"> <span>Soliq ({selectedOrder.tax_percent || 0}%):</span> <span>+ {parseFloat(String(selectedOrder.tax_amount)).toLocaleString()} so'm</span> </div>)}
                  <div className="flex justify-between font-semibold pt-1"> <span>Jami to'lov:</span> <span>{parseFloat(String(selectedOrder.final_price || 0)).toLocaleString()} so'm</span> </div>
                </div>
                <Button className="w-full h-12 text-base font-semibold" size="lg" onClick={handlePayment} disabled={!!selectedOrder.payment || paymentMutation.isPending} >
                  {paymentMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {selectedOrder.payment ? "TO'LANGAN" : "To'lov Qilish"}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
              <Receipt className="mb-4 h-16 w-16 text-gray-400" />
              <h3 className="text-xl font-semibold">Buyurtma Tanlanmagan</h3>
              <p className="max-w-xs mt-2 text-sm">Tafsilotlarni ko'rish va to'lov qilish uchun chap tomondagi ro'yxatdan buyurtmani tanlang.</p>
            </div>
          )}
        </div>
      </div>

      {/* === MODALLAR === */}
      {/* ... (Dialoglar kodi o'zgarishsiz qoladi) ... */}

      {/* To'lov Dialogi */}
      {isClient && selectedOrder && !selectedOrder.payment && (
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader> <DialogTitle>To'lov (Buyurtma #{selectedOrder.id})</DialogTitle> <DialogDescription>To'lov usulini tanlang va ma'lumotlarni kiriting.</DialogDescription> </DialogHeader>
            {paymentError && (<div className="bg-destructive/10 border border-destructive text-destructive text-sm rounded-md p-3 my-3 text-center break-words">{paymentError}</div>)}
            <div className="py-4">
              <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'cash' | 'card' | 'mobile')}>
                <TabsList className="grid w-full grid-cols-3 h-11"> <TabsTrigger value="cash" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"> <DollarSign className="h-4 w-4" /> Naqd </TabsTrigger> <TabsTrigger value="card" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"> <CreditCard className="h-4 w-4" /> Karta </TabsTrigger> <TabsTrigger value="mobile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"> <Smartphone className="h-4 w-4" /> Mobil </TabsTrigger> </TabsList>
                <TabsContent value="cash" className="mt-4 space-y-4"> <div className="space-y-1"> <Label htmlFor="payment-total-cash" className="text-xs text-muted-foreground">Jami summa</Label> <Input id="payment-total-cash" value={`${parseFloat(String(selectedOrder.final_price || 0)).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50" /> </div> <div className="space-y-1"> <Label htmlFor="received">Qabul qilingan summa*</Label> <Input id="received" type="number" placeholder="Summani kiriting" value={cashReceived} onChange={(e) => setCashReceived(e.target.value.replace(/\D/g, ''))} className="h-11 text-base" min="0" step="any" required /> </div> {parseFloat(cashReceived) >= parseFloat(String(selectedOrder.final_price || 0)) && (<div className="space-y-1"> <Label htmlFor="change" className="text-xs text-muted-foreground">Qaytim</Label> <Input id="change" value={`${calculateChange().toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50" /> </div>)} </TabsContent>
                <TabsContent value="card" className="mt-4 space-y-4"> <div className="space-y-1"> <Label htmlFor="payment-total-card" className="text-xs text-muted-foreground">Jami summa</Label> <Input id="payment-total-card" value={`${parseFloat(String(selectedOrder.final_price || 0)).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50" /> </div> <div className="text-center text-muted-foreground p-4 border rounded-md bg-muted/50"> <CreditCard className="mx-auto h-8 w-8 mb-2 text-primary" /> <p className="text-sm">Iltimos, to'lovni POS terminal orqali amalga oshiring.</p> </div> </TabsContent>
                <TabsContent value="mobile" className="mt-4 space-y-4"> <div className="space-y-1"> <Label htmlFor="payment-total-mobile" className="text-xs text-muted-foreground">Jami summa</Label> <Input id="payment-total-mobile" value={`${parseFloat(String(selectedOrder.final_price || 0)).toLocaleString()} so'm`} readOnly className="font-semibold text-base h-11 bg-muted/50" /> </div> <div className="text-center space-y-3"> <p className="text-sm text-muted-foreground">Mobil to'lov tizimini tanlang*</p> <div className="grid grid-cols-3 gap-2 sm:gap-3"> {["Payme", "Click", "Apelsin"].map((provider) => (<Button key={provider} variant={selectedMobileProvider === provider ? "default" : "outline"} onClick={() => setSelectedMobileProvider(provider)} className="h-11 text-sm"> {provider} </Button>))} </div> </div> </TabsContent>
              </Tabs>
            </div>
            <DialogFooter className="mt-2"> <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={paymentMutation.isPending}>Bekor qilish</Button> <Button onClick={handleCompletePayment} disabled={paymentMutation.isPending || (paymentMethod === "cash" && (isNaN(parseFloat(cashReceived)) || parseFloat(cashReceived) < parseFloat(String(selectedOrder.final_price || 0)))) || (paymentMethod === "mobile" && !selectedMobileProvider)}> {paymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} To'lovni Yakunlash </Button> </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Chek Ko'rsatish Dialogi */}
      {isClient && (
        <Dialog open={showReceiptDialog} onOpenChange={(open) => { if (!open) { setReceiptData(null); setReceiptError(null); setIsReceiptLoading(false); setReceiptOrderId(null); } setShowReceiptDialog(open); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader> <DialogTitle>Chek (Buyurtma #{receiptOrderId || 'N/A'})</DialogTitle> {!receiptError && <DialogDescription>To'lov ma'lumotlari.</DialogDescription>} </DialogHeader>
            {isReceiptLoading && (<div className="flex flex-col items-center justify-center h-40 my-4 text-muted-foreground"> <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /> Chek ma'lumotlari yuklanmoqda... </div>)}
            {!isReceiptLoading && receiptError && (<div className="flex flex-col items-center justify-center h-40 my-4 text-center text-destructive bg-destructive/10 p-4 rounded-md"> <AlertTriangle className="h-8 w-8 mb-2" /> <p className="text-sm font-medium mb-2">Xatolik!</p> <p className="text-xs mb-4 break-words">{receiptError}</p> <Button variant="outline" size="sm" onClick={() => fetchReceiptDataInternal(receiptOrderId)} disabled={isReceiptLoading}> <RotateCcw className="mr-2 h-3 w-3" /> Qayta urinish </Button> </div>)}
            {!isReceiptLoading && receiptData && (
              <>
                <ScrollArea className="max-h-[60vh] my-4">
                  <div className="p-4 border border-dashed border-foreground/50 rounded-md font-mono text-xs leading-relaxed bg-white text-black">
                    <div className="text-center mb-3"> <h3 className="font-bold text-sm uppercase">{receiptData.restaurant_name || 'Restoran Nomi'}</h3> {receiptData.restaurant_address && <p>{receiptData.restaurant_address}</p>} {receiptData.restaurant_phone && <p>Tel: {receiptData.restaurant_phone}</p>} {receiptData.restaurant_inn && <p>INN: {receiptData.restaurant_inn}</p>} </div>
                    <Separator className="border-dashed border-black/50 my-2" />
                    <div className="mb-2"> {receiptData.cashier_name && <p>Kassir: {receiptData.cashier_name}</p>} {receiptData.payment_time && <p>Sana: {receiptData.payment_time}</p>} {receiptData.check_number && <p>Chek #: {receiptData.check_number}</p>} {receiptData.order_type_display && <p>Buyurtma turi: <span className="capitalize">{receiptData.order_type_display}</span></p>} </div>
                    <Separator className="border-dashed border-black/50 my-2" />
                    <div className="space-y-1 mb-2"> {Array.isArray(receiptData.items) && receiptData.items.length > 0 ? (receiptData.items.map((item, index) => (<div key={`receipt-item-${index}-${item.product_name}`} className="grid grid-cols-[1fr_auto_auto] gap-1 items-start"> <span className="col-span-3 font-medium break-words">{item.product_name || "Noma'lum"}</span> <span className="text-right">{item.quantity || 0} x {parseFloat(String(item.unit_price || 0)).toLocaleString()}</span> <span>=</span> <span className="text-right font-medium">{parseFloat(String(item.total_item_price || 0)).toLocaleString()}</span> </div>))) : (<p className="text-center text-gray-600">Mahsulotlar yo'q</p>)} </div>
                    <Separator className="border-dashed border-black/50 my-2" />
                    <div className="space-y-1"> {Number(receiptData.subtotal || 0) > 0 && <div className="flex justify-between"><span>Mahsulotlar jami:</span><span>{parseFloat(String(receiptData.subtotal)).toLocaleString()} so'm</span></div>} {Number(receiptData.service_fee_percent || 0) > 0 && (<div className="flex justify-between text-gray-700"> <span>Xizmat haqi ({parseFloat(String(receiptData.service_fee_percent || 0)).toFixed(2)}%):</span> <span>+ {parseFloat(String(receiptData.service_fee_amount || 0)).toLocaleString()} so'm</span> </div>)} {Number(receiptData.tax_percent || 0) > 0 && (<div className="flex justify-between text-gray-700"> <span>Soliq ({parseFloat(String(receiptData.tax_percent || 0)).toFixed(2)}%):</span> <span>+ {parseFloat(String(receiptData.tax_amount || 0)).toLocaleString()} so'm</span> </div>)} <div className="flex justify-between font-bold text-sm pt-1"> <span>JAMI TO'LOV:</span> <span>{parseFloat(String(receiptData.final_price || 0)).toLocaleString()} so'm</span> </div> </div>
                    <Separator className="border-dashed border-black/50 my-2" />
                    <div className="space-y-1"> {receiptData.payment_method_display && <div className="flex justify-between"><span>To'lov usuli:</span><span className="capitalize">{receiptData.payment_method_display}</span></div>} {receiptData.received_amount && <div className="flex justify-between"><span>Qabul qilindi:</span><span>{parseFloat(String(receiptData.received_amount)).toLocaleString()} so'm</span></div>} {receiptData.change_amount && Number(receiptData.change_amount) > 0 && <div className="flex justify-between"><span>Qaytim:</span><span>{parseFloat(String(receiptData.change_amount)).toLocaleString()} so'm</span></div>} </div>
                    <Separator className="border-dashed border-black/50 my-2" />
                    <div className="text-center mt-3"> <p>Xaridingiz uchun rahmat!</p> <p>Yana keling!</p> </div>
                  </div>
                </ScrollArea>
                <DialogFooter> <Button className="w-full" onClick={handlePrintAndCloseReceipt}><Printer className="mr-2 h-4 w-4" /> Chop etish va Yakunlash</Button> </DialogFooter>
              </>
            )}
            {!isReceiptLoading && !receiptData && !receiptError && (<div className="flex items-center justify-center h-20 text-muted-foreground">Chek ma'lumotlari topilmadi.</div>)}
            {!isReceiptLoading && receiptError && (<DialogFooter><DialogClose asChild><Button variant="outline">Yopish</Button></DialogClose></DialogFooter>)}
          </DialogContent>
        </Dialog>
      )}

      {/* Tarix Tafsilotlarini Ko'rish Dialogi */}
      {isClient && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader> <DialogTitle>Buyurtma Tafsilotlari (#{viewingOrderDetails?.id})</DialogTitle> </DialogHeader>
            <ScrollArea className="max-h-[70vh] my-4 pr-6">
              {viewingOrderDetails ? (
                <div className="space-y-4">
                  <Card><CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Asosiy ma'lumotlar</CardTitle></CardHeader><CardContent className="p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><p><strong>ID:</strong> {viewingOrderDetails.id}</p><p><strong>Turi:</strong> {viewingOrderDetails.order_type_display}</p><p><strong>Holati:</strong> {viewingOrderDetails.payment ? "To'langan" : viewingOrderDetails.status_display || "Noma'lum"}</p><p><strong>Stol:</strong> {viewingOrderDetails.table?.name || "Yo'q"}</p><p><strong>Yaratildi:</strong> {formatTime(viewingOrderDetails.created_at)}</p>{viewingOrderDetails.payment?.timestamp && <p><strong>To'landi:</strong> {formatTime(viewingOrderDetails.payment.timestamp)}</p>}<p><strong>Jami:</strong> {parseFloat(String(viewingOrderDetails.final_price || 0)).toLocaleString()} so'm</p>{viewingOrderDetails.payment?.method_display && <p><strong>To'lov usuli:</strong> <span className="capitalize">{viewingOrderDetails.payment.method_display}</span></p>}{viewingOrderDetails.payment?.processed_by_name && <p><strong>Kassir:</strong> {viewingOrderDetails.payment.processed_by_name}</p>}</CardContent></Card>
                  {(viewingOrderDetails.customer_name || viewingOrderDetails.customer_phone || viewingOrderDetails.customer_address) && (<Card><CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Mijoz</CardTitle></CardHeader><CardContent className="p-3 text-xs space-y-1">{viewingOrderDetails.customer_name && <p><strong>Ism:</strong> {viewingOrderDetails.customer_name}</p>}{viewingOrderDetails.customer_phone && <p><strong>Telefon:</strong> {viewingOrderDetails.customer_phone}</p>}{viewingOrderDetails.customer_address && <p><strong>Manzil:</strong> {viewingOrderDetails.customer_address}</p>}</CardContent></Card>)}
                  <Card><CardHeader className="p-3 bg-muted/50"><CardTitle className="text-sm font-semibold">Tarkibi</CardTitle></CardHeader><CardContent className="p-0">{Array.isArray(viewingOrderDetails.items) && viewingOrderDetails.items.length > 0 ? (<ul className="divide-y">{viewingOrderDetails.items.map((item) => (<li key={item.id || `detail-item-${item.product}`} className="flex items-center justify-between p-3 gap-2 text-xs"><div className="flex items-center gap-2 min-w-0"><img src={item.product_details?.image_url || "/placeholder-product.jpg"} alt={item.product_details?.name || ""} className="w-8 h-8 object-cover rounded shrink-0" onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }} /> <span className="font-medium truncate">{item.product_details?.name || "Noma'lum"}</span> <span className="text-muted-foreground">(x{item.quantity})</span></div><span className="font-semibold whitespace-nowrap">{parseFloat(String(item.total_price || 0)).toLocaleString()} so'm</span></li>))}</ul>) : <p className="p-4 text-center text-muted-foreground text-xs">Tarkibi topilmadi.</p>}</CardContent></Card>
                  {viewingOrderDetails.payment && (<Button variant="outline" size="sm" className="w-full mt-2" onClick={() => fetchReceiptDataInternal(viewingOrderDetails.id)} disabled={isReceiptLoading && receiptOrderId === viewingOrderDetails.id}> {isReceiptLoading && receiptOrderId === viewingOrderDetails.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />} Chekni Ko'rish </Button>)}
                </div>
              ) : (<p className="text-center text-muted-foreground py-6">Ma'lumotlar topilmadi.</p>)}
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t"> <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Yopish</Button> </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}