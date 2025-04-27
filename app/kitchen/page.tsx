"use client"

// React ni import qilish kerak (ayniqsa React.cloneElement uchun)
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// useQueryClient hookini alohida import qilish yaxshiroq
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query"
import axios, { AxiosError } from "axios"
import { Clock, LogOut, ChevronDown, ChevronUp, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// ----- TypeScript Interfeyslari -----
// (Oldingi javobdagidek - o'zgartirishsiz)
interface ProductDetails {
  name: string;
  image_url?: string;
}
interface OrderItem {
  id: number;
  product_details?: ProductDetails;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
}
interface TableInfo {
  name: string;
  zone?: string;
}
interface Order {
  id: number;
  status: 'pending' | 'new' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  status_display: string;
  order_type: 'delivery' | 'takeaway' | 'dine-in';
  order_type_display: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  created_at: string;
  updated_at?: string;
  ready_at?: string;
  completed_at?: string;
  table?: TableInfo | null;
  final_price: string | number;
  items: OrderItem[];
  service_fee_percent?: number;
  tax_percent?: number;
}
interface NotificationLog {
  id: number;
  order_id: number;
  product_name: string;
  change_type_display: string;
  quantity_change?: number | null;
  timestamp: string;
  user_name?: string | null;
}

// ----- API Funksiyalari -----

const API_BASE_URL = "https://oshxonacopy.pythonanywhere.com/api"

// Axios instance (token bilan)
const apiClient = axios.create({ baseURL: API_BASE_URL })

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token && config.headers) { // config.headers mavjudligini tekshirish
      config.headers.Authorization = `Bearer ${token}`
    }
    // Content-Type har doim o'rnatiladi
    if (config.headers) {
      config.headers["Content-Type"] = "application/json"
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Xatoliklarni qayta ishlash uchun yordamchi funksiya
// Endi queryClientni parametr sifatida qabul qiladi
const handleApiError = (
  error: unknown,
  context: string,
  router: ReturnType<typeof useRouter>,
  queryClientInstance: QueryClient // queryClient ni qabul qilish
) => {
  console.error(`${context} xatosi:`, error);
  let errorMessage = `Noma'lum xatolik (${context})`;
  if (error instanceof AxiosError) {
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = "Sessiya muddati tugagan yoki avtorizatsiya xatosi.";
        // Toast ko'rsatishdan oldin token va keshni tozalash
        localStorage.removeItem("token"); // Faqat tokenni o'chirish
        queryClientInstance.removeQueries(); // Barcha so'rovlarni va keshni tozalash
        toast.error(errorMessage + " Iltimos, qayta kiring.");
        router.push("/auth"); // Login sahifasiga yo'naltirish
        return errorMessage; // Keyingi xabar chiqishini to'xtatish
      }
      // Boshqa backend xatoliklari
      errorMessage = error.response.data?.detail || error.response.data?.message || `Server xatosi (${error.response.status})`;
    } else if (error.request) {
      errorMessage = "Server bilan bog'lanishda xatolik. Internet aloqangizni tekshiring.";
    } else {
      errorMessage = error.message || "So'rovni yuborishda xatolik.";
    }
  }
  // Agar 401 bo'lmasa yoki boshqa xatolik bo'lsa, toast ko'rsatiladi
  toast.error(`${context}: ${errorMessage}`);
  return errorMessage; // Xabar matnini qaytarish
};

// --- Query Funksiyalari ---
// Endi queryClient ni handleApiError ga uzatadi
const fetchOrders = async (router: ReturnType<typeof useRouter>, queryClientInstance: QueryClient): Promise<Order[]> => {
  try {
    const res = await apiClient.get<Order[]>("/orders/")
    const fetchedOrders = res.data || []
    return fetchedOrders.filter(
      (order) => order.status !== "completed" && order.status !== "served" && order.status !== "cancelled"
    );
  } catch (error) {
    // handleApiErrorga queryClient ni ham berish
    handleApiError(error, "Buyurtmalarni yuklash", router, queryClientInstance);
    throw error;
  }
}

const fetchNotifications = async (router: ReturnType<typeof useRouter>, queryClientInstance: QueryClient): Promise<NotificationLog[]> => {
  try {
    const response = await apiClient.get<NotificationLog[]>("/kitchen/unacknowledged-changes/");
    return response.data || [];
  } catch (error) {
    console.error("Bildirishnomalarni yuklashda xato:", error);
    if (error instanceof AxiosError && error.response?.status === 401) {
      // handleApiErrorga queryClient ni ham berish
      handleApiError(error, "Bildirishnomalarni yuklash", router, queryClientInstance);
    }
    return [];
  }
}

const fetchOrderDetails = async (orderId: number | null, router: ReturnType<typeof useRouter>, queryClientInstance: QueryClient): Promise<Order | null> => {
  if (!orderId) return null;
  try {
    const response = await apiClient.get<Order>(`/orders/${orderId}/`);
    return response.data;
  } catch (error) {
    // handleApiErrorga queryClient ni ham berish
    handleApiError(error, "Buyurtma tafsilotlarini yuklash", router, queryClientInstance);
    throw error;
  }
}


// --- Mutation Funksiyalari ---
// (O'zgartirishsiz - ular xatolikni yuqoriga uzatadi, useMutation onError hal qiladi)
const startPreparation = async ({ orderId }: { orderId: number }) => {
  const { data } = await apiClient.post(`/orders/${orderId}/start_preparation/`, {})
  return data
}
const markOrderReady = async ({ orderId }: { orderId: number }) => {
  const { data } = await apiClient.post(`/orders/${orderId}/mark_ready/`, {})
  return data
}
const markOrderServed = async ({ orderId }: { orderId: number }) => {
  const { data } = await apiClient.post(`/orders/${orderId}/mark-served/`, {})
  return data
}
const cancelOrder = async ({ orderId }: { orderId: number }) => {
  const { data } = await apiClient.post(`/orders/${orderId}/cancel_order/`, {})
  return data
}
const acknowledgeNotification = async ({ logIds }: { logIds: number[] }) => {
  const { data } = await apiClient.post(`/kitchen/acknowledge-changes/`, { log_ids: logIds });
  return data;
}


// localStorage uchun kalit so'z (key)
const LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY = "kitchenVisibleCategories"

// Boshlang'ich visibleCategories holatini localStorage'dan olish
// (O'zgartirishsiz)
const getInitialVisibleCategories = (): { new: boolean; preparing: boolean; ready: boolean } => {
  if (typeof window === "undefined") {
    return { new: true, preparing: true, ready: true }
  }
  try {
    const storedValue = localStorage.getItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY)
    if (storedValue) {
      const parsedValue = JSON.parse(storedValue)
      if (
        typeof parsedValue === 'object' &&
        parsedValue !== null &&
        'new' in parsedValue &&
        'preparing' in parsedValue &&
        'ready' in parsedValue &&
        typeof parsedValue.new === 'boolean' &&
        typeof parsedValue.preparing === 'boolean' &&
        typeof parsedValue.ready === 'boolean'
      ) {
        if ('completed' in parsedValue) {
          delete parsedValue.completed;
          localStorage.setItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY, JSON.stringify(parsedValue));
        }
        return parsedValue
      } else {
        console.warn("localStorage visibleCategories formati yoki turi noto'g'ri. Standart qiymat.")
        localStorage.removeItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY)
        return { new: true, preparing: true, ready: true }
      }
    }
  } catch (error) {
    console.error("localStorage'dan o'qishda xato:", error)
  }
  return { new: true, preparing: true, ready: true }
}


export default function KitchenPage() {
  const router = useRouter()
  // queryClient ni hook orqali olish
  const queryClient = useQueryClient()

  // Mahalliy UI state'lar
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedOrderIdForDetails, setSelectedOrderIdForDetails] = useState<number | null>(null)
  const [openCollapsibles, setOpenCollapsibles] = useState({ new: true, preparing: true, ready: true })
  const [visibleCategories, setVisibleCategories] = useState(getInitialVisibleCategories)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  // Token tekshiruvi (sahifa yuklanganda bir marta)
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      toast.info("Iltimos, tizimga kiring.")
      queryClient.removeQueries(); // Agar token yo'q bo'lsa, keshni tozalash
      router.push("/auth")
    }
  }, [router, queryClient]) // queryClient ni dependency ga qo'shish

  // ----- React Query Hooks -----

  // Buyurtmalarni olish
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useQuery<Order[], AxiosError>({
    queryKey: ['orders', 'kitchen'],
    // queryFn ga queryClient ni uzatish
    queryFn: () => fetchOrders(router, queryClient),
    refetchInterval: 5000,
    staleTime: 3000,
    enabled: !!localStorage.getItem('token'), // Token mavjud bo'lsagina ishga tushirish
    onError: (error) => {
      console.error("useQuery Orders onError:", error);
      // Xato allaqachon handleApiError da qayta ishlanadi
    }
  })

  // Bildirishnomalarni olish (10 sekundlik interval bilan)
  const {
    data: notifications = [],
    isLoading: isLoadingNotifications,
    error: notificationsErrorObject,
  } = useQuery<NotificationLog[], AxiosError>({
    queryKey: ['notifications', 'kitchen'],
    // queryFn ga queryClient ni uzatish
    queryFn: () => fetchNotifications(router, queryClient),
    refetchInterval: 10000,
    staleTime: 8000,
    refetchOnWindowFocus: true,
    enabled: !!localStorage.getItem('token'), // Token mavjud bo'lsagina ishga tushirish
    onError: (error) => {
      console.error("useQuery Notifications onError:", error);
      // Xato allaqachon handleApiError da qayta ishlanadi
    }
  });

  // Buyurtma tafsilotlarini olish (faqat modal ochilganda)
  const {
    data: selectedOrderDetails,
    isLoading: detailsLoading,
    error: detailsErrorObject,
  } = useQuery<Order | null, AxiosError>({
    queryKey: ['orderDetails', selectedOrderIdForDetails],
    // queryFn ga queryClient ni uzatish
    queryFn: () => fetchOrderDetails(selectedOrderIdForDetails, router, queryClient),
    // enabled: !!selectedOrderIdForDetails && isDetailsOpen, // Bu shart to'g'ri
    // Token mavjudligini ham tekshirish
    enabled: !!selectedOrderIdForDetails && isDetailsOpen && !!localStorage.getItem('token'),
    staleTime: 60000,
    onError: (error) => {
      console.error("useQuery OrderDetails onError:", error);
      // Xato allaqachon handleApiError da qayta ishlanadi
    }
  });


  // ----- Mutations -----

  // onError da handleApiError ni ishlatish
  const mutationOnError = (error: unknown, variables: any) => {
    // Mutatsiya kontekstini (masalan, buyurtma ID si) olish uchun variables dan foydalanish
    const contextInfo = variables?.orderId
      ? `Buyurtma #${variables.orderId}`
      : variables?.logIds
        ? `Bildirishnoma #${variables.logIds[0]}`
        : "Mutatsiya";
    handleApiError(error, contextInfo, router, queryClient);
  };

  // Buyurtmani tayyorlashni boshlash mutatsiyasi
  const startPreparationMutation = useMutation({
    mutationFn: startPreparation,
    onMutate: async ({ orderId }) => {
      toast.info(`Buyurtma #${orderId} tayyorlash boshlanmoqda...`)
      await queryClient.cancelQueries({ queryKey: ['orders', 'kitchen'] })
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', 'kitchen'])
      queryClient.setQueryData<Order[]>(['orders', 'kitchen'], (old) =>
        old?.map((order) =>
          order.id === orderId
            ? { ...order, status: "preparing", status_display: "Tayyorlanmoqda" }
            : order
        ) ?? []
      )
      return { previousOrders }
    },
    onError: (err, variables, context) => {
      mutationOnError(err, variables); // Umumiy xatolik ishlovchisi
      if (context?.previousOrders) {
        queryClient.setQueryData<Order[]>(['orders', 'kitchen'], context.previousOrders);
      }
    },
    onSuccess: (data, variables) => {
      toast.success(`Buyurtma #${variables.orderId} tayyorlash boshlandi!`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'kitchen'] })
    },
  })

  // Buyurtmani tayyor deb belgilash mutatsiyasi
  const markReadyMutation = useMutation({
    mutationFn: markOrderReady,
    onMutate: async ({ orderId }) => {
      toast.info(`Buyurtma #${orderId} tayyor deb belgilanmoqda...`)
      await queryClient.cancelQueries({ queryKey: ['orders', 'kitchen'] });
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', 'kitchen']);
      const readyTime = new Date().toISOString();
      queryClient.setQueryData<Order[]>(['orders', 'kitchen'], (old) =>
        old?.map(order =>
          order.id === orderId
            ? { ...order, status: "ready", status_display: "Tayyor", ready_at: readyTime }
            : order
        ) ?? []
      );
      return { previousOrders };
    },
    onError: (err, variables, context) => {
      mutationOnError(err, variables); // Umumiy xatolik ishlovchisi
      if (context?.previousOrders) {
        queryClient.setQueryData<Order[]>(['orders', 'kitchen'], context.previousOrders);
      }
    },
    onSuccess: (data, variables) => {
      toast.success(`Buyurtma #${variables.orderId} tayyor!`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'kitchen'] });
    },
  })

  // Buyurtmani mijozga berildi deb belgilash mutatsiyasi
  const markServedMutation = useMutation({
    mutationFn: markOrderServed,
    onMutate: async ({ orderId }) => {
      toast.info(`Buyurtma #${orderId} mijozga berildi deb belgilanmoqda...`);
      await queryClient.cancelQueries({ queryKey: ['orders', 'kitchen'] });
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', 'kitchen']);
      queryClient.setQueryData<Order[]>(['orders', 'kitchen'], (old) =>
        old?.filter(order => order.id !== orderId) ?? []
      );
      return { previousOrders };
    },
    onError: (err, variables, context) => {
      mutationOnError(err, variables); // Umumiy xatolik ishlovchisi
      if (context?.previousOrders) {
        queryClient.setQueryData<Order[]>(['orders', 'kitchen'], context.previousOrders);
      }
    },
    onSuccess: (data, variables) => {
      toast.success(`Buyurtma #${variables.orderId} 'Mijozga berildi' deb belgilandi!`);
    },
    onSettled: () => {
      // Optimistik bo'lgani uchun shart emas
    },
  });


  // Buyurtmani bekor qilish mutatsiyasi
  const cancelOrderMutation = useMutation({
    mutationFn: cancelOrder,
    onMutate: async ({ orderId }) => {
      if (!window.confirm(`Haqiqatan ham #${orderId} raqamli buyurtmani bekor qilmoqchimisiz?`)) {
        throw new Error("CancelledByUser");
      }
      toast.info(`Buyurtma #${orderId} bekor qilinmoqda...`);
      await queryClient.cancelQueries({ queryKey: ['orders', 'kitchen'] });
      const previousOrders = queryClient.getQueryData<Order[]>(['orders', 'kitchen']);
      queryClient.setQueryData<Order[]>(['orders', 'kitchen'], (old) =>
        old?.filter(order => order.id !== orderId) ?? []
      );
      return { previousOrders };
    },
    onError: (err: unknown, variables, context) => {
      if (err instanceof Error && err.message === "CancelledByUser") {
        toast.info("Bekor qilish amali to'xtatildi.");
        return;
      }
      mutationOnError(err, variables); // Umumiy xatolik ishlovchisi
      if (context?.previousOrders) {
        queryClient.setQueryData<Order[]>(['orders', 'kitchen'], context.previousOrders);
      }
    },
    onSuccess: (data, variables) => {
      toast.success(`Buyurtma #${variables.orderId} bekor qilindi!`);
    },
    onSettled: (data, error) => {
      if (!(error instanceof Error && error.message === "CancelledByUser")) {
        queryClient.invalidateQueries({ queryKey: ['orders', 'kitchen'] });
      }
    },
  });

  // Bildirishnomani tasdiqlash mutatsiyasi
  const acknowledgeNotificationMutation = useMutation({
    mutationFn: acknowledgeNotification,
    onMutate: async ({ logIds }) => {
      const logId = logIds[0];
      await queryClient.cancelQueries({ queryKey: ['notifications', 'kitchen'] });
      const previousNotifications = queryClient.getQueryData<NotificationLog[]>(['notifications', 'kitchen']);
      queryClient.setQueryData<NotificationLog[]>(['notifications', 'kitchen'], (old) =>
        old?.filter(notification => notification.id !== logId) ?? []
      );
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      mutationOnError(err, variables); // Umumiy xatolik ishlovchisi
      if (context?.previousNotifications) {
        queryClient.setQueryData<NotificationLog[]>(['notifications', 'kitchen'], context.previousNotifications);
      }
    },
    onSuccess: (data, variables) => {
      toast.success(`Bildirishnoma #${variables.logIds[0]} tasdiqlandi!`);
    },
    onSettled: () => {
      // Optimistik bo'lgani uchun shart emas
    },
  });


  // ----- Yordamchi funksiyalar -----
  // (O'zgartirishsiz)
  const filteredOrders = (status: 'new' | 'preparing' | 'ready'): Order[] => {
    if (!orders) return [];
    switch (status) {
      case "new": return orders.filter((order) => order.status === "pending" || order.status === "new");
      case "preparing": return orders.filter((order) => order.status === "preparing");
      case "ready": return orders.filter((order) => order.status === "ready");
      default: return [];
    }
  }
  const formatTime = (dateString: string | null | undefined): string => {
    try {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Xato Sana";
      return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    } catch (error) { console.error("Vaqtni formatlashda xato:", error, dateString); return "Vaqt Xato"; }
  }
  const getTimeDifference = (dateString: string | null | undefined): string => {
    try {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Xato Sana";
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSeconds < 5) return `hozir`;
      if (diffSeconds < 60) return `${diffSeconds} soniya`;
      const diffMinutes = Math.floor(diffSeconds / 60);
      if (diffMinutes < 60) return `${diffMinutes} daqiqa`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} soat`;
      const diffDays = Math.floor(diffHours / 24);
      return diffDays === 1 ? `kecha` : `${diffDays} kun`;
    } catch (error) { console.error("Vaqt farqini hisoblashda xato:", error, dateString); return "Vaqt Xato"; }
  }

  // ----- Event Handlerlar -----
  // (O'zgartirishsiz)
  const handleStartPreparing = (orderId: number) => { startPreparationMutation.mutate({ orderId }) }
  const handleOrderReady = (orderId: number) => { markReadyMutation.mutate({ orderId }) }
  const handleMarkServed = (orderId: number) => {
    const orderToMark = orders.find((o) => o.id === orderId);
    if (orderToMark && orderToMark.status !== 'ready') {
      toast.warn(`Faqat 'Tayyor' buyurtmani belgilash mumkin (#${orderId})`);
      return;
    }
    markServedMutation.mutate({ orderId });
  }
  const handleCancelOrder = (orderId: number) => { cancelOrderMutation.mutate({ orderId }); }
  const handleAcknowledgeNotification = (logId: number) => { acknowledgeNotificationMutation.mutate({ logIds: [logId] }); }
  const handleViewDetailsClick = (orderId: number) => { setSelectedOrderIdForDetails(orderId); setIsDetailsOpen(true); }
  const handleLogout = () => { setIsLogoutOpen(true) }

  // ----- LOGOUT FUNKSIYASI YANGILANDI -----
  const confirmLogout = () => {
    // 1. Avval token va boshqa saqlangan ma'lumotlarni tozalaymiz
    localStorage.clear(); // Yoki faqat tokenni: localStorage.removeItem('token');

    // 2. React Query ning BARCHA aktiv so'rovlarini va keshini o'chiramiz.
    // Bu davom etayotgan so'rovlarni bekor qiladi va interval refetchlarni to'xtatadi.
    queryClient.removeQueries(); // <<<--- MUHIM O'ZGARTIRISH

    // 3. Foydalanuvchini login sahifasiga yo'naltiramiz
    router.push("/auth");

    // 4. Logout dialogini yopamiz va xabarni ko'rsatamiz
    // (redirectdan keyin ishlashi uchun biroz kechiktirish mumkin, lekin shart emas)
    setIsLogoutOpen(false);
    // Toastni redirectdan keyin ko'rsatish uchun biroz kechiktirish mumkin:
    // setTimeout(() => toast.success("Tizimdan muvaffaqiyatli chiqdingiz!"), 100);
    // Yoki hozirgidek qoldirish ham mumkin:
    toast.success("Tizimdan muvaffaqiyatli chiqdingiz!");
  }

  // (Qolgan event handlerlar o'zgartirishsiz)
  const toggleCollapsible = (category: keyof typeof openCollapsibles) => { setOpenCollapsibles((prev) => ({ ...prev, [category]: !prev[category], })) }
  const handleCategoryToggle = (category: keyof typeof visibleCategories) => {
    const newState = { ...visibleCategories, [category]: !visibleCategories[category], }
    setVisibleCategories(newState)
    try { localStorage.setItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY, JSON.stringify(newState)) }
    catch (error) { console.error("visibleCategories localStorage saqlashda xatolik:", error); toast.error("Filtr sozlamalarini saqlashda xatolik."); }
  }

  // ----- Buyurtma kartasi komponenti -----
  interface OrderCardProps { order: Order; actionButton?: React.ReactNode; }
  const OrderCard: React.FC<OrderCardProps> = ({ order, actionButton }) => {
    const canCancel = order.status === "pending" || order.status === "new";
    const cardBgColor = order.status === "pending" || order.status === "new" ? "bg-blue-50" : order.status === "preparing" ? "bg-yellow-50" : order.status === "ready" ? "bg-green-50" : "bg-white";
    const tableInfo = order.table;
    const formatPrice = (price: string | number | undefined): string => `${parseFloat(String(price || 0)).toLocaleString()} so'm`;

    return (
      <Card className={`flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border ${cardBgColor}`}>
        <CardHeader className={`p-3 shrink-0 ${cardBgColor}`}>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 mb-1 truncate">
                <span className="cursor-pointer hover:underline" onClick={() => handleViewDetailsClick(order.id)}>#{order.id}</span>
                <Badge variant={order.order_type === "delivery" ? "destructive" : "outline"} className="text-xs px-1.5 py-0.5 flex-shrink-0">{order.order_type_display}</Badge>
              </CardTitle>
              {(order.order_type === "delivery" || order.order_type === "takeaway") && (<div className="mt-1 space-y-0.5 text-xs text-gray-700"> {order.customer_name && <div className="font-medium truncate">{order.customer_name}</div>} {order.customer_phone && (<div className="text-muted-foreground">Tel: {order.customer_phone}</div>)} {order.order_type === "delivery" && order.customer_address && (<div className="text-muted-foreground truncate">Manzil: {order.customer_address}</div>)} </div>)}
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center"> <Clock className="h-3 w-3 inline mr-1 flex-shrink-0" /> <span>{formatTime(order.created_at)}</span> <span className="mx-1 text-gray-400">•</span> <span>({getTimeDifference(order.created_at)})</span> </div>
              {tableInfo && (<div className="text-sm font-medium text-gray-800 mt-1.5"> {tableInfo.zone && <span className="text-muted-foreground">({tableInfo.zone})</span>} <span className="ml-1">Stol: {tableInfo.name}</span> </div>)}
              <div className="text-xs font-semibold text-gray-800 mt-2">{formatPrice(order.final_price)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-t bg-white/70 flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="p-2 space-y-1.5">
              {Array.isArray(order.items) && order.items.length > 0 ? (order.items.map((item) => (<div key={item.id} className="flex items-center gap-2 text-xs"> <img src={item.product_details?.image_url || "/placeholder-product.jpg"} alt={item.product_details?.name || "Noma'lum mahsulot"} className="w-7 h-7 object-cover rounded border flex-shrink-0 bg-muted" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.jpg"; }} loading="lazy" /> <span className="flex-1 font-medium truncate" title={item.product_details?.name}> {item.product_details?.name || "Noma'lum"} </span> <Badge variant="outline" className="px-1.5 py-0.5 font-mono text-xs"> x{item.quantity} </Badge> </div>))) : (<p className="text-xs text-muted-foreground text-center py-2">Mahsulotlar yo'q.</p>)}
            </div>
          </ScrollArea>
        </CardContent>
        {(actionButton || canCancel) && (
          <CardFooter className="border-t p-2 bg-white shrink-0">
            <div className="flex flex-col space-y-1.5 w-full">
              {actionButton && React.isValidElement(actionButton) && React.cloneElement(actionButton, { disabled: startPreparationMutation.isPending || markReadyMutation.isPending || markServedMutation.isPending || cancelOrderMutation.isPending })}
              {canCancel && (<Button variant="destructive" size="sm" className="w-full" onClick={() => handleCancelOrder(order.id)} disabled={cancelOrderMutation.isPending || startPreparationMutation.isPending || markReadyMutation.isPending || markServedMutation.isPending}> Bekor qilish </Button>)}
            </div>
          </CardFooter>
        )}
      </Card>
    )
  }

  // ----- UI QISMI -----
  // (O'zgartirishsiz - oldingi javobdagidek)

  // Asosiy yuklanish holati
  if (isLoadingOrders && !queryClient.getQueryData(['orders', 'kitchen'])) {
    return <div className="flex h-screen items-center justify-center text-lg font-medium text-gray-600">Buyurtmalar yuklanmoqda...</div>
  }

  // Agar birinchi yuklashda xatolik bo'lsa
  const initialError = ordersError && !queryClient.getQueryData(['orders', 'kitchen']);
  if (initialError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center px-4">
        <p className="text-destructive text-lg mb-4">Buyurtmalarni yuklashda xatolik yuz berdi.</p>
        <Button onClick={() => queryClient.refetchQueries({ queryKey: ['orders', 'kitchen'] })}>Qayta yuklash</Button>
      </div>
    )
  }

  const visibleCategoryCount = Object.values(visibleCategories).filter(Boolean).length
  const gridColsClass = visibleCategoryCount === 3 ? "grid-cols-1 md:grid-cols-3" : visibleCategoryCount === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";
  const detailsErrorMessage = detailsErrorObject ? (detailsErrorObject as any).message || "Tafsilotlarni yuklashda xatolik." : "";
  const notificationsErrorMessage = notificationsErrorObject ? "Bildirishnomalarni yuklashda xatolik." : "";

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <ToastContainer position="bottom-right" autoClose={4000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />

      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-4"><h1 className="text-xl font-bold text-gray-800">Oshxona Paneli</h1></div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Filter Select */}
          <Select>
            <SelectTrigger className="w-auto sm:w-[150px] md:w-[180px] h-9 text-sm"><SelectValue placeholder="Filtr" /></SelectTrigger>
            <SelectContent>
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleCategoryToggle("new")}><Checkbox id="filter-new" checked={visibleCategories.new} readOnly className="cursor-pointer" /><label htmlFor="filter-new" className="text-sm font-medium cursor-pointer select-none">Yangi ({filteredOrders("new").length})</label></div>
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleCategoryToggle("preparing")}><Checkbox id="filter-preparing" checked={visibleCategories.preparing} readOnly className="cursor-pointer" /><label htmlFor="filter-preparing" className="text-sm font-medium cursor-pointer select-none">Tayyorlanmoqda ({filteredOrders("preparing").length})</label></div>
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleCategoryToggle("ready")}><Checkbox id="filter-ready" checked={visibleCategories.ready} readOnly className="cursor-pointer" /><label htmlFor="filter-ready" className="text-sm font-medium cursor-pointer select-none">Mijozga berish ({filteredOrders("ready").length})</label></div>
              </div>
            </SelectContent>
          </Select>
          {/* Notifications Button */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 relative" onClick={() => setIsNotificationsOpen(true)} aria-label="Bildirishnomalar">
              <Bell className="h-5 w-5 text-gray-600" />
              {notifications && notifications.length > 0 && (<Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full text-xs p-0 pointer-events-none">{notifications.length}</Badge>)}
            </Button>
          </div>
          {/* Logout Button */}
          <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100" onClick={handleLogout} aria-label="Chiqish"><LogOut className="h-5 w-5 text-gray-600" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Tizimdan chiqishni tasdiqlaysizmi?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Bekor qilish</AlertDialogCancel><AlertDialogAction onClick={confirmLogout} className="bg-red-600 hover:bg-red-700">Chiqish</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Notifications Modal */}
      <AlertDialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <AlertDialogContent className="max-w-md sm:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Oxirgi O'zgarishlar</AlertDialogTitle></AlertDialogHeader>
          <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto -mx-4 px-4 py-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
            {isLoadingNotifications && notifications.length === 0 ? (<div className="flex items-center justify-center h-32 text-gray-500">Bildirishnomalar yuklanmoqda...</div>)
              : notificationsErrorObject ? (<div className="text-destructive text-center p-4 bg-red-50 rounded">{notificationsErrorMessage}</div>)
                : notifications.length === 0 ? (<div className="flex items-center justify-center h-32 text-muted-foreground">Hozircha yangi o'zgarishlar yo'q.</div>)
                  : (notifications.map((notification) => (
                    <Card key={notification.id} className={`p-3 text-sm border ${notification.quantity_change !== null && notification.quantity_change < 0 ? "bg-red-50 border-red-200 hover:border-red-300" : "bg-blue-50 border-blue-200 hover:border-blue-300"} transition-colors duration-150`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">Buyurtma #{notification.order_id} - {notification.product_name}</p>
                          <p className={`font-semibold ${notification.quantity_change !== null && notification.quantity_change < 0 ? "text-red-600" : "text-green-600"}`}> {notification.change_type_display} {notification.quantity_change !== null ? ` (${notification.quantity_change > 0 ? "+" : ""}${notification.quantity_change} dona)` : ""} </p>
                          <p className="text-xs text-gray-500 mt-1">{formatTime(notification.timestamp)} ({getTimeDifference(notification.timestamp)})</p>
                          <p className="text-xs text-gray-500">Kim: {notification.user_name || "Noma'lum"}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 px-2 flex-shrink-0" onClick={() => handleAcknowledgeNotification(notification.id)} disabled={acknowledgeNotificationMutation.isPending && acknowledgeNotificationMutation.variables?.logIds?.includes(notification.id)}> Ok </Button>
                      </div>
                    </Card>))
                  )}
          </div>
          <AlertDialogFooter className="mt-4 pt-4 border-t"><AlertDialogCancel>Yopish</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Order Details Modal */}
      <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-xl md:max-w-2xl">
          <AlertDialogHeader><AlertDialogTitle>{selectedOrderDetails ? `Buyurtma #${selectedOrderDetails.id} Tafsilotlari` : "Tafsilotlar"}</AlertDialogTitle></AlertDialogHeader>
          <div className="max-h-[70vh] md:max-h-[75vh] overflow-y-auto -mx-6 px-6 pt-2 pb-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
            {detailsLoading ? (<div className="text-center p-10 text-gray-500">Ma'lumotlar yuklanmoqda...</div>)
              : detailsErrorObject ? (<div className="text-center p-10 text-red-600 bg-red-50 rounded border border-red-200"> <p className="font-semibold">Xatolik!</p> <p>{detailsErrorMessage}</p> <Button variant="outline" size="sm" onClick={() => queryClient.refetchQueries({ queryKey: ['orderDetails', selectedOrderIdForDetails] })} className="mt-4">Qayta urinish</Button> </div>)
                : selectedOrderDetails ? (<> <Card className="shadow-none border"> <CardHeader className="p-3 bg-gray-50 border-b"><CardTitle className="text-base font-semibold">Asosiy ma'lumotlar</CardTitle></CardHeader> <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm"> <p><strong>ID:</strong> {selectedOrderDetails.id}</p> <div className="flex items-center gap-2"><strong>Turi:</strong> <Badge variant={selectedOrderDetails.order_type === "delivery" ? "destructive" : "outline"} className="text-xs">{selectedOrderDetails.order_type_display}</Badge></div> <div className="flex items-center gap-2"><strong>Holati:</strong> <Badge variant="secondary" className="text-xs">{selectedOrderDetails.status_display}</Badge></div> <p><strong>Stol:</strong> {selectedOrderDetails.table?.name || "Ko'rsatilmagan"}</p> {selectedOrderDetails.table?.zone && <p><strong>Zona:</strong> {selectedOrderDetails.table.zone}</p>} <p><strong>Yaratildi:</strong> {formatTime(selectedOrderDetails.created_at)} ({getTimeDifference(selectedOrderDetails.created_at)})</p> {selectedOrderDetails.updated_at && selectedOrderDetails.updated_at !== selectedOrderDetails.created_at && (<p><strong>Yangilandi:</strong> {formatTime(selectedOrderDetails.updated_at)} ({getTimeDifference(selectedOrderDetails.updated_at)})</p>)} {selectedOrderDetails.ready_at && <p><strong>Tayyor bo'ldi:</strong> {formatTime(selectedOrderDetails.ready_at)} ({getTimeDifference(selectedOrderDetails.ready_at)})</p>} {selectedOrderDetails.completed_at && <p><strong>Bajarildi:</strong> {formatTime(selectedOrderDetails.completed_at)} ({getTimeDifference(selectedOrderDetails.completed_at)})</p>} {selectedOrderDetails.service_fee_percent !== undefined && <p><strong>Xizmat haqi:</strong> {selectedOrderDetails.service_fee_percent}%</p>} {selectedOrderDetails.tax_percent !== undefined && <p><strong>Soliq:</strong> {selectedOrderDetails.tax_percent}%</p>} <p className="sm:col-span-2 pt-2 border-t mt-2 text-base"><strong>Jami narx:</strong> <span className="font-bold">{parseFloat(String(selectedOrderDetails.final_price || 0)).toLocaleString()} so'm</span></p> </CardContent> </Card> {(selectedOrderDetails.customer_name || selectedOrderDetails.customer_phone || selectedOrderDetails.customer_address) && (<Card className="shadow-none border"> <CardHeader className="p-3 bg-gray-50 border-b"><CardTitle className="text-base font-semibold">Mijoz ma'lumotlari</CardTitle></CardHeader> <CardContent className="p-3 text-sm space-y-1"> {selectedOrderDetails.customer_name && <p><strong>Ism:</strong> {selectedOrderDetails.customer_name}</p>} {selectedOrderDetails.customer_phone && <p><strong>Telefon:</strong> <a href={`tel:${selectedOrderDetails.customer_phone}`} className="text-blue-600 hover:underline">{selectedOrderDetails.customer_phone}</a></p>} {selectedOrderDetails.customer_address && <p><strong>Manzil:</strong> {selectedOrderDetails.customer_address}</p>} </CardContent> </Card>)} <Card className="shadow-none border"> <CardHeader className="p-3 bg-gray-50 border-b"><CardTitle className="text-base font-semibold">Buyurtma tarkibi ({selectedOrderDetails.items?.length || 0} dona)</CardTitle></CardHeader> <CardContent className="p-0"> {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (<ul className="divide-y divide-gray-200"> {selectedOrderDetails.items.map((item) => (<li key={item.id} className="p-3 flex items-start sm:items-center space-x-3"> {item.product_details?.image_url ? (<img src={item.product_details.image_url} alt={item.product_details.name} className="w-12 h-12 object-cover rounded border flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = "/placeholder-product.jpg"; }} loading="lazy" />) : (<div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xl flex-shrink-0">?</div>)} <div className="flex-1 text-sm min-w-0"> <p className="font-medium truncate">{item.product_details?.name || "Noma'lum"}</p> <p className="text-gray-600">{item.quantity} x {parseFloat(String(item.unit_price || 0)).toLocaleString()} so'm</p> </div> <p className="font-semibold text-sm text-right flex-shrink-0">{parseFloat(String(item.total_price || 0)).toLocaleString()} so'm</p> </li>))} </ul>) : (<p className="p-4 text-center text-gray-500">Buyurtma tarkibi bo'sh.</p>)} </CardContent> </Card> </>)
                  : (<div className="text-center p-10 text-gray-500">Ma'lumotlar topilmadi yoki yuklanmadi.</div>)}
          </div>
          <AlertDialogFooter className="mt-4 pt-4 border-t"><AlertDialogCancel>Yopish</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Main content */}
      <main className="flex-1 p-3 sm:p-4 overflow-hidden">
        {visibleCategoryCount === 0 ? (<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-lg p-4"> <Bell className="w-16 h-16 text-gray-300 mb-4" /> <p>Hech qanday kategoriya tanlanmagan.</p> <p className="text-sm mt-1">Iltimos, yuqoridagi filtr orqali kerakli kategoriyalarni tanlang.</p> </div>)
          : (<div className={`grid gap-3 sm:gap-4 ${gridColsClass} h-full`}>
            {/* Yangi buyurtmalar */}
            {visibleCategories.new && (<div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200"> <Collapsible open={openCollapsibles.new} onOpenChange={() => toggleCollapsible("new")} className="flex-1 flex flex-col overflow-hidden"> <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors duration-150 cursor-pointer shrink-0"> <h2 className="text-base sm:text-lg font-semibold text-blue-700">Yangi ({filteredOrders("new").length})</h2> {openCollapsibles.new ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />} </CollapsibleTrigger> <CollapsibleContent className="flex-1 overflow-hidden"> <ScrollArea className="h-full w-full"> <div className="p-2 sm:p-3 space-y-2 sm:space-y-3"> {filteredOrders("new").length === 0 ? (<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Yangi buyurtmalar yo'q.</div>) : (filteredOrders("new").map((order) => (<OrderCard key={`new-${order.id}`} order={order} actionButton={<Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleStartPreparing(order.id)} disabled={startPreparationMutation.isPending}> Tayyorlash </Button>} />)))} </div> </ScrollArea> </CollapsibleContent> </Collapsible> </div>)}
            {/* Tayyorlanmoqda buyurtmalar */}
            {visibleCategories.preparing && (<div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200"> <Collapsible open={openCollapsibles.preparing} onOpenChange={() => toggleCollapsible("preparing")} className="flex-1 flex flex-col overflow-hidden"> <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors duration-150 cursor-pointer shrink-0"> <h2 className="text-base sm:text-lg font-semibold text-yellow-700">Tayyorlanmoqda ({filteredOrders("preparing").length})</h2> {openCollapsibles.preparing ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />} </CollapsibleTrigger> <CollapsibleContent className="flex-1 overflow-hidden"> <ScrollArea className="h-full w-full"> <div className="p-2 sm:p-3 space-y-2 sm:space-y-3"> {filteredOrders("preparing").length === 0 ? (<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Tayyorlanayotgan buyurtmalar yo'q.</div>) : (filteredOrders("preparing").map((order) => (<OrderCard key={`preparing-${order.id}`} order={order} actionButton={<Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => handleOrderReady(order.id)} disabled={markReadyMutation.isPending}> Tayyor </Button>} />)))} </div> </ScrollArea> </CollapsibleContent> </Collapsible> </div>)}
            {/* Mijozga berildi buyurtmalar */}
            {visibleCategories.ready && (<div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200"> <Collapsible open={openCollapsibles.ready} onOpenChange={() => toggleCollapsible("ready")} className="flex-1 flex flex-col overflow-hidden"> <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors duration-150 cursor-pointer shrink-0"> <h2 className="text-base sm:text-lg font-semibold text-green-700">Mijozga Berish ({filteredOrders("ready").length})</h2> {openCollapsibles.ready ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />} </CollapsibleTrigger> <CollapsibleContent className="flex-1 overflow-hidden"> <ScrollArea className="h-full w-full"> <div className="p-2 sm:p-3 space-y-2 sm:space-y-3"> {filteredOrders("ready").length === 0 ? (<div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Mijozga beriladigan buyurtmalar yo'q.</div>) : (filteredOrders("ready").map((order) => (<OrderCard key={`ready-${order.id}`} order={order} actionButton={<Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMarkServed(order.id)} disabled={markServedMutation.isPending}> Mijozga Berildi </Button>} />)))} </div> </ScrollArea> </CollapsibleContent> </Collapsible> </div>)}
          </div>
          )}
      </main>
    </div>
  )
}