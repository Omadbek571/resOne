"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// localStorage uchun kalit so'z (key)
const LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY = "kitchenVisibleCategories"

// Boshlang'ich visibleCategories holatini localStorage'dan olish yoki default qiymatni qaytarish
const getInitialVisibleCategories = () => {
  if (typeof window === "undefined") {
    return { new: true, preparing: true, ready: true }
  }
  try {
    const storedValue = localStorage.getItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY)
    if (storedValue) {
      const parsedValue = JSON.parse(storedValue)
      if (
        typeof parsedValue === "object" &&
        parsedValue !== null &&
        "new" in parsedValue &&
        "preparing" in parsedValue &&
        "ready" in parsedValue
      ) {
        if ('completed' in parsedValue) {
            delete parsedValue.completed;
            localStorage.setItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY, JSON.stringify(parsedValue));
        }
        return parsedValue
      } else {
        console.warn("localStorage visibleCategories formati noto'g'ri. Standart qiymat.")
        localStorage.removeItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY);
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
  const [orders, setOrders] = useState([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(true)
  const [error, setError] = useState("")
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState("")
  const [openCollapsibles, setOpenCollapsibles] = useState({
    new: true,
    preparing: true,
    ready: true,
  })
  const [visibleCategories, setVisibleCategories] = useState(getInitialVisibleCategories)
  const [notifications, setNotifications] = useState([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState("")

  // Buyurtmalarni yuklash
  useEffect(() => {
    setIsLoadingOrders(true)
    const token = localStorage.getItem("token");
    if (!token) {
        setError("Avtorizatsiya tokeni topilmadi. Iltimos, qayta kiring.")
        toast.error("Avtorizatsiya tokeni topilmadi.")
        setIsLoadingOrders(false)
        router.push("/auth")
        return;
    }

    axios
      .get("https://oshxonacopy.pythonanywhere.com/api/orders/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        const fetchedOrders = res.data || [];
        // Oshxona uchun faqat 'completed' yoki 'served' bo'lmaganlarni ko'rsatish
        const activeOrders = fetchedOrders.filter(
          (order) => order.status !== "completed" && order.status !== "served" && order.status !== 'cancelled'
        );
        setOrders(activeOrders);
        setIsLoadingOrders(false)
        if (activeOrders.length === 0) {
           // toast.info("Hozirda aktiv buyurtmalar mavjud emas.")
        }
      })
      .catch((err) => {
        console.error("Buyurtmalarni yuklashda xato:", err)
         if (err.response && err.response.status === 401) {
            setError("Sessiya muddati tugagan. Iltimos, qayta kiring.")
            toast.error("Sessiya muddati tugagan.")
            localStorage.removeItem("token")
            router.push("/auth")
        } else {
            setError("Buyurtmalarni yuklashda xato yuz berdi.")
            toast.error("Buyurtmalarni yuklashda xato yuz berdi.")
        }
        setIsLoadingOrders(false)
      })
  }, [router])

  // Token tekshiruvi
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth")
      toast.info("Iltimos, tizimga kiring.")
    }
  }, [router])

  // Bildirishnomalarni yuklash
  useEffect(() => {
    const fetchNotifications = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setNotificationsLoading(true);
        setNotificationsError("");
        try {
            const response = await axios.get("https://oshxonacopy.pythonanywhere.com/api/kitchen/unacknowledged-changes/", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                }
            });
            setNotifications(response.data || []);
        } catch (err) {
            console.error("Bildirishnomalarni yuklashda xato:", err);
            // Xatolik haqida batafsilroq ma'lumot berish shart emas, chunki bu fon jarayoni
        } finally {
            setNotificationsLoading(false);
        }
    }
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000); // Har 30 sekundda
    return () => clearInterval(intervalId); // Komponent yo'q qilinganda intervalni tozalash
  }, []) // Bo'sh massiv, faqat bir marta ishga tushadi (va intervalni o'rnatadi)

  // Buyurtmalarni holat bo'yicha filtrlash
  const filteredOrders = (status) => {
    switch (status) {
      case "new":
        return orders.filter((order) => order.status === "pending" || order.status === "new");
      case "preparing":
        return orders.filter((order) => order.status === "preparing");
      case "ready":
        return orders.filter((order) => order.status === "ready");
      default:
        return [];
    }
  }

  // Buyurtma holatini "Tayyorlash"ga o'zgartirish
  const handleStartPreparing = async (orderId) => {
    const originalOrders = [...orders];
    const orderToUpdate = originalOrders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    // Optimistik UI
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: "preparing", status_display: "Tayyorlanmoqda" } : order
      )
    );
    toast.info(`Buyurtma #${orderId} tayyorlash boshlanmoqda...`);

    try {
      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/start_preparation/`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`Buyurtma #${orderId} tayyorlash boshlandi!`);
    } catch (err) {
      console.error(`Buyurtma #${orderId} tayyorlashda xato:`, err);
      setOrders(originalOrders); // Xatoda UI ni qaytarish
      const errorMessage = err.response?.data?.detail || "Noma'lum xatolik";
      toast.error(`Xatolik (#${orderId}): ${errorMessage}`);
    }
  }

  // Buyurtma holatini "Tayyor"ga o'zgartirish
  const handleOrderReady = async (orderId) => {
    const originalOrders = [...orders];
    const orderToUpdate = originalOrders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const readyTime = new Date().toISOString();
    // Optimistik UI
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: "ready", status_display: "Tayyor", ready_at: readyTime } : order
      )
    );
    toast.info(`Buyurtma #${orderId} tayyor deb belgilanmoqda...`);

    try {
      await axios.post(
        `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/mark_ready/`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success(`Buyurtma #${orderId} tayyor!`);
    } catch (err) {
      console.error(`Buyurtma #${orderId} tayyor deb belgilashda xato:`, err);
      setOrders(originalOrders); // Xatoda UI ni qaytarish
      const errorMessage = err.response?.data?.detail || "Noma'lum xatolik";
      toast.error(`Xatolik (#${orderId}): ${errorMessage}`);
    }
  }

  // Buyurtma holatini "Mijozga berildi" (served) ga o'zgartirish
  const handleMarkServed = async (orderId) => {
      const orderToMark = orders.find((o) => o.id === orderId);
      if (!orderToMark) {
          toast.warn(`Buyurtma #${orderId} topilmadi.`);
          return;
      }
      if (orderToMark.status !== 'ready') {
           toast.warn(`Faqat 'Tayyor' buyurtmani belgilash mumkin (#${orderId})`);
           return;
      }
      const originalOrders = [...orders];
      // Optimistik UI
      setOrders((prevOrders) => prevOrders.filter((o) => o.id !== orderId));
      toast.info(`Buyurtma #${orderId} mijozga berildi deb belgilanmoqda...`);

      try {
          await axios.post(
              `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/mark-served/`,
              {},
              { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          toast.success(`Buyurtma #${orderId} 'Mijozga berildi' deb belgilandi!`);
      } catch (err) {
          console.error(`Buyurtma #${orderId} belgilashda xato:`, err);
          setOrders(originalOrders); // Xatoda UI ni qaytarish
          const errorMessage = err.response?.data?.detail || "Noma'lum xatolik";
          toast.error(`Xatolik (#${orderId}): ${errorMessage}`);
      }
  }

  // Buyurtmani bekor qilish funksiyasi
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Haqiqatan ham #${orderId} raqamli buyurtmani bekor qilmoqchimisiz?`)) return;
    const originalOrders = [...orders];
    // Optimistik UI
    setOrders((prevOrders) => prevOrders.filter((o) => o.id !== orderId));
    toast.info(`Buyurtma #${orderId} bekor qilinmoqda...`);

    try {
        await axios.post(
            `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/cancel_order/`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        toast.success(`Buyurtma #${orderId} bekor qilindi!`);
    } catch (err) {
        console.error(`#${orderId} bekor qilishda xato:`, err);
        setOrders(originalOrders); // Xatoda UI ni qaytarish
        const errorMessage = err.response?.data?.detail || "Noma'lum xatolik";
        toast.error(`Xatolik (#${orderId}): ${errorMessage}`);
    }
}


  // Bildirishnomalarni tasdiqlash
  const handleAcknowledgeNotification = async (logId) => {
      const originalNotifications = [...notifications];
      // Optimistik UI
      setNotifications((prevNotifications) =>
          prevNotifications.filter((notification) => notification.id !== logId)
      );
      try {
          await axios.post(
              `https://oshxonacopy.pythonanywhere.com/api/kitchen/acknowledge-changes/`,
              { log_ids: [logId] },
              {
                  headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
              }
          );
          toast.success(`Bildirishnoma #${logId} tasdiqlandi!`);
      } catch (err) {
          console.error("Bildirishnomani tasdiqlashda xato:", err);
          setNotifications(originalNotifications); // Xatoda UI ni qaytarish
          toast.error("Bildirishnomani tasdiqlashda xatolik yuz berdi");
      }
  }

  // Vaqtni formatlash funksiyasi
  const formatTime = (dateString) => {
    try {
      if (!dateString) return "N/A";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Xato";
      return date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      console.error("Vaqtni formatlashda xato:", error);
      return "Xatolik";
    }
  }

    // Vaqt farqini hisoblash funksiyasi
    const getTimeDifference = (dateString) => {
        try {
            if (!dateString) return "N/A";
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "Xato";
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
        } catch (error) {
            console.error("Vaqt farqini hisoblashda xato:", error);
            return "Xatolik";
        }
    };

  // Batafsil ko'rish funksiyasi (Endi OrderCard'dan chaqirilmaydi)
  const handleViewDetails = async (orderId) => {
    // Agar bu funksiya kelajakda boshqa joydan chaqirilsa, logikasi ishlayveradi
    if (detailsLoading && selectedOrderDetails?.id === orderId) return;
    setDetailsLoading(true);
    setDetailsError("");
    setSelectedOrderDetails(null);
    setIsDetailsOpen(true);
    try {
        const response = await axios.get(`https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        setSelectedOrderDetails(response.data);
    } catch (err) {
        console.error("Buyurtma tafsilotlarini yuklashda xato:", err);
        setDetailsError("Tafsilotlarni yuklashda xatolik yuz berdi.");
        toast.error("Tafsilotlarni yuklashda xatolik yuz berdi.");
    } finally {
        setDetailsLoading(false);
    }
}


  // Chiqish funksiyasi
  const handleLogout = () => {
    setIsLogoutOpen(true);
  }

  // Modal tasdiqlanganda chiqish
  const confirmLogout = () => {
    localStorage.clear(); // Token va boshqa ma'lumotlarni tozalash
    router.push("/auth");
    setIsLogoutOpen(false);
    toast.success("Tizimdan muvaffaqiyatli chiqdingiz!");
  }

  // Collapsible holatini boshqarish
  const toggleCollapsible = (category) => {
    if (category in openCollapsibles) {
        setOpenCollapsibles((prev) => ({
        ...prev,
        [category]: !prev[category],
        }));
    }
  }

  // Checkbox holatini boshqarish va localStorage ga saqlash
  const handleCategoryToggle = (category) => {
    if (category in visibleCategories) {
        const newState = {
            ...visibleCategories,
            [category]: !visibleCategories[category],
        };
        setVisibleCategories(newState);
        try {
            localStorage.setItem(LOCAL_STORAGE_VISIBLE_CATEGORIES_KEY, JSON.stringify(newState));
        } catch (error) {
            console.error("visibleCategories'ni localStorage'ga saqlashda xatolik:", error);
            toast.error("Filtr sozlamalarini saqlashda xatolik yuz berdi");
        }
    }
  };

  // Buyurtma kartasi komponenti (Batafsil tugmasi olib tashlandi, layout to'g'rilandi)
  const OrderCard = ({ order, actionButton }) => {
    const canCancel = order.status === "pending" || order.status === "new";
    const cardBgColor =
        order.status === "pending" || order.status === "new" ? "bg-blue-50" :
        order.status === "preparing" ? "bg-yellow-50" :
        order.status === "ready" ? "bg-green-50" :
        "bg-white";
    const tableInfo = order.table;

    return (
      <Card className={`flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border ${cardBgColor}`}>
        <CardHeader className={`p-3 shrink-0 ${cardBgColor}`}>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 mb-1 truncate">
                <span>#{order.id}</span>
                <Badge variant={order.order_type === "delivery" ? "destructive" : "outline"} className="text-xs px-1.5 py-0.5 flex-shrink-0">
                  {order.order_type_display}
                </Badge>
              </CardTitle>
              {(order.order_type === "delivery" || order.order_type === "takeaway") && (
                <div className="mt-1 space-y-0.5 text-xs text-gray-700">
                  {order.customer_name && <div className="font-medium truncate">{order.customer_name}</div>}
                  {order.customer_phone && (<div className="text-muted-foreground">Tel: {order.customer_phone}</div>)}
                  {order.order_type === "delivery" && order.customer_address && (<div className="text-muted-foreground truncate">Manzil: {order.customer_address}</div>)}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1.5 flex items-center">
                <Clock className="h-3 w-3 inline mr-1 flex-shrink-0" />
                <span>{formatTime(order.created_at)}</span>
                <span className="mx-1 text-gray-400">•</span>
                <span>({getTimeDifference(order.created_at)})</span>
              </div>
              {tableInfo && (
                <div className="text-sm font-medium text-gray-800 mt-1.5">
                  {tableInfo.zone && <span className="text-muted-foreground">({tableInfo.zone})</span>}
                  <span className="ml-1">Stol: {tableInfo.name}</span>
                </div>
              )}
              <div className="text-xs font-semibold text-gray-800 mt-2">{parseFloat(order.final_price || 0).toLocaleString()} so'm</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 border-t bg-white/70 flex-1 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="p-2 space-y-1.5">
                {Array.isArray(order.items) && order.items.length > 0 ? (
                order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                        <img
                            src={item.product_details?.image_url || "/placeholder-product.jpg"}
                            alt={item.product_details?.name || ""}
                            className="w-7 h-7 object-cover rounded border flex-shrink-0 bg-muted"
                            onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                        />
                        <span className="flex-1 font-medium truncate" title={item.product_details?.name}>
                            {item.product_details?.name || "Noma'lum"}
                        </span>
                        <Badge variant="outline" className="px-1.5 py-0.5 font-mono text-xs">
                            x{item.quantity}
                        </Badge>
                    </div>
                ))
                ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Mahsulotlar yo'q.</p>
                )}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Tugmalar uchun CardFooter (Faqat action yoki cancel bo'lsa) */}
        {(actionButton || canCancel) && (
            <CardFooter className="border-t p-2 bg-white shrink-0">
            <div className="flex flex-col space-y-1.5 w-full">
                {actionButton && <div className="w-full">{actionButton}</div>}
                {/* Batafsil tugmasi olib tashlandi */}
                {canCancel && (<Button variant="destructive" size="sm" className="w-full" onClick={() => handleCancelOrder(order.id)}>Bekor qilish</Button>)}
            </div>
            </CardFooter>
        )}
      </Card>
    )
  }

  // --- UI QISMI BOSHLANISHI ---
  if (isLoadingOrders) { return <div className="flex h-screen items-center justify-center text-lg font-medium text-gray-600">Yuklanmoqda...</div> }
  if (error) { return (<div className="flex h-screen flex-col items-center justify-center text-center px-4"><p className="text-destructive text-lg mb-4">{error}</p><Button onClick={() => window.location.reload()}>Qayta yuklash</Button></div>) }

  const visibleCategoryCount = Object.values(visibleCategories).filter(Boolean).length;
  const gridColsClass = visibleCategoryCount === 3 ? "grid-cols-1 md:grid-cols-3" : visibleCategoryCount === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <ToastContainer position="bottom-right" autoClose={4000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
      <header className="flex h-16 items-center justify-between border-b bg-white px-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center space-x-4"><h1 className="text-xl font-bold text-gray-800">Oshxona Paneli</h1></div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Select>
            <SelectTrigger className="w-auto sm:w-[150px] md:w-[180px] h-9 text-sm"><SelectValue placeholder="Filtr" /></SelectTrigger>
            <SelectContent>
              <div className="p-2 space-y-2">
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleCategoryToggle("new")}><Checkbox id="filter-new" checked={visibleCategories.new} readOnly className="cursor-pointer"/><label htmlFor="filter-new" className="text-sm font-medium cursor-pointer select-none">Yangi ({filteredOrders("new").length})</label></div>
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleCategoryToggle("preparing")}><Checkbox id="filter-preparing" checked={visibleCategories.preparing} readOnly className="cursor-pointer"/><label htmlFor="filter-preparing" className="text-sm font-medium cursor-pointer select-none">Tayyorlanmoqda ({filteredOrders("preparing").length})</label></div>
                <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded" onClick={() => handleCategoryToggle("ready")}><Checkbox id="filter-ready" checked={visibleCategories.ready} readOnly className="cursor-pointer"/><label htmlFor="filter-ready" className="text-sm font-medium cursor-pointer select-none">Mijozga berildi ({filteredOrders("ready").length})</label></div>
              </div>
            </SelectContent>
          </Select>
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 relative" onClick={() => setIsNotificationsOpen(true)} aria-label="Bildirishnomalar">
              <Bell className="h-5 w-5 text-gray-600" />
              {notifications.length > 0 && (<Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full text-xs p-0 pointer-events-none">{notifications.length}</Badge>)}
            </Button>
          </div>
          <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100" onClick={handleLogout} aria-label="Chiqish"><LogOut className="h-5 w-5 text-gray-600" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Tizimdan chiqishni tasdiqlaysizmi?</AlertDialogTitle></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Bekor qilish</AlertDialogCancel><AlertDialogAction onClick={confirmLogout} className="bg-red-600 hover:bg-red-700">Chiqish</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

       <AlertDialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
         <AlertDialogContent className="max-w-md sm:max-w-lg">
          <AlertDialogHeader><AlertDialogTitle>Oxirgi O'zgarishlar</AlertDialogTitle></AlertDialogHeader>
          <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto -mx-4 px-4 py-2 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
            {notificationsLoading ? ( <div className="flex items-center justify-center h-32 text-gray-500">Bildirishnomalar yuklanmoqda...</div>)
             : notificationsError ? ( <div className="text-destructive text-center p-4 bg-red-50 rounded">{notificationsError}</div> )
             : notifications.length === 0 ? ( <div className="flex items-center justify-center h-32 text-muted-foreground">Hozircha yangi o'zgarishlar yo'q.</div> )
             : ( notifications.map((notification) => ( <Card key={notification.id} className={`p-3 text-sm border ${ notification.quantity_change < 0 ? "bg-red-50 border-red-200 hover:border-red-300" : "bg-blue-50 border-blue-200 hover:border-blue-300" } transition-colors duration-150`}> <div className="flex justify-between items-start gap-3"> <div className="flex-1 min-w-0"> <p className="font-medium text-gray-800 truncate">Buyurtma #{notification.order_id} - {notification.product_name}</p> <p className={`font-semibold ${notification.quantity_change < 0 ? "text-red-600" : "text-green-600"}`}> {notification.change_type_display} {notification.quantity_change !== null ? ` (${notification.quantity_change > 0 ? "+" : ""}${notification.quantity_change} dona)` : ""} </p> <p className="text-xs text-gray-500 mt-1">{formatTime(notification.timestamp)} ({getTimeDifference(notification.timestamp)})</p> <p className="text-xs text-gray-500">Kim: {notification.user_name || "Noma'lum"}</p> </div> <Button variant="outline" size="sm" className="h-8 px-2 flex-shrink-0" onClick={() => handleAcknowledgeNotification(notification.id)}>Ok</Button> </div> </Card> )) )}
          </div>
          <AlertDialogFooter className="mt-4 pt-4 border-t"><AlertDialogCancel>Yopish</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <AlertDialogContent className="max-w-xl md:max-w-2xl">
          <AlertDialogHeader><AlertDialogTitle>{selectedOrderDetails ? `Buyurtma #${selectedOrderDetails.id} Tafsilotlari` : "Tafsilotlar"}</AlertDialogTitle></AlertDialogHeader>
          <div className="max-h-[70vh] md:max-h-[75vh] overflow-y-auto -mx-6 px-6 pt-2 pb-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
            {detailsLoading ? ( <div className="text-center p-10 text-gray-500">Ma'lumotlar yuklanmoqda...</div> )
            : detailsError ? ( <div className="text-center p-10 text-red-600 bg-red-50 rounded border border-red-200"><p className="font-semibold">Xatolik!</p><p>{detailsError}</p><Button variant="outline" size="sm" onClick={() => handleViewDetails(selectedOrderDetails?.id)} className="mt-4">Qayta urinish</Button></div> )
            : selectedOrderDetails ? ( <> <Card className="shadow-none border"> <CardHeader className="p-3 bg-gray-50 border-b"><CardTitle className="text-base font-semibold">Asosiy ma'lumotlar</CardTitle></CardHeader> <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm"> <p><strong>ID:</strong> {selectedOrderDetails.id}</p> <div className="flex items-center gap-2"><strong>Turi:</strong> <Badge variant={selectedOrderDetails.order_type === "delivery" ? "destructive" : "outline"} className="text-xs">{selectedOrderDetails.order_type_display}</Badge></div> <div className="flex items-center gap-2"><strong>Holati:</strong> <Badge variant="secondary" className="text-xs">{selectedOrderDetails.status_display}</Badge></div> <p><strong>Stol:</strong> {selectedOrderDetails.table?.name || "Ko'rsatilmagan"}</p> {selectedOrderDetails.table?.zone && <p><strong>Zona:</strong> {selectedOrderDetails.table.zone}</p>} <p><strong>Yaratildi:</strong> {formatTime(selectedOrderDetails.created_at)} ({getTimeDifference(selectedOrderDetails.created_at)})</p> {selectedOrderDetails.updated_at && selectedOrderDetails.updated_at !== selectedOrderDetails.created_at && ( <p><strong>Yangilandi:</strong> {formatTime(selectedOrderDetails.updated_at)} ({getTimeDifference(selectedOrderDetails.updated_at)})</p> )} {selectedOrderDetails.ready_at && <p><strong>Tayyor bo'ldi:</strong> {formatTime(selectedOrderDetails.ready_at)} ({getTimeDifference(selectedOrderDetails.ready_at)})</p>} {selectedOrderDetails.completed_at && <p><strong>Bajarildi:</strong> {formatTime(selectedOrderDetails.completed_at)} ({getTimeDifference(selectedOrderDetails.completed_at)})</p>} <p><strong>Xizmat haqi:</strong> {selectedOrderDetails.service_fee_percent}%</p> <p><strong>Soliq:</strong> {selectedOrderDetails.tax_percent}%</p> <p className="sm:col-span-2 pt-2 border-t mt-2 text-base"><strong>Jami narx:</strong> <span className="font-bold">{parseFloat(selectedOrderDetails.final_price || 0).toLocaleString()} so'm</span></p> </CardContent> </Card> {(selectedOrderDetails.customer_name || selectedOrderDetails.customer_phone || selectedOrderDetails.customer_address) && ( <Card className="shadow-none border"> <CardHeader className="p-3 bg-gray-50 border-b"><CardTitle className="text-base font-semibold">Mijoz ma'lumotlari</CardTitle></CardHeader> <CardContent className="p-3 text-sm space-y-1"> {selectedOrderDetails.customer_name && <p><strong>Ism:</strong> {selectedOrderDetails.customer_name}</p>} {selectedOrderDetails.customer_phone && <p><strong>Telefon:</strong> <a href={`tel:${selectedOrderDetails.customer_phone}`} className="text-blue-600 hover:underline">{selectedOrderDetails.customer_phone}</a></p>} {selectedOrderDetails.customer_address && <p><strong>Manzil:</strong> {selectedOrderDetails.customer_address}</p>} </CardContent> </Card> )} <Card className="shadow-none border"> <CardHeader className="p-3 bg-gray-50 border-b"><CardTitle className="text-base font-semibold">Buyurtma tarkibi ({selectedOrderDetails.items?.length || 0} dona)</CardTitle></CardHeader> <CardContent className="p-0"> {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? ( <ul className="divide-y divide-gray-200"> {selectedOrderDetails.items.map((item) => ( <li key={item.id} className="p-3 flex items-start sm:items-center space-x-3"> {item.product_details?.image_url ? ( <img src={item.product_details.image_url} alt={item.product_details.name} className="w-12 h-12 object-cover rounded border flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder-product.jpg"; }}/> ) : ( <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xl flex-shrink-0">?</div> )} <div className="flex-1 text-sm min-w-0"> <p className="font-medium truncate">{item.product_details?.name || "Noma'lum"}</p> <p className="text-gray-600">{item.quantity} x {parseFloat(item.unit_price || 0).toLocaleString()} so'm</p> </div> <p className="font-semibold text-sm text-right flex-shrink-0">{parseFloat(item.total_price || 0).toLocaleString()} so'm</p> </li> ))} </ul> ) : ( <p className="p-4 text-center text-gray-500">Buyurtma tarkibi bo'sh.</p> )} </CardContent> </Card> </> )
            : ( <div className="text-center p-10 text-gray-500">Ma'lumotlar topilmadi yoki yuklanmadi.</div> )}
          </div>
          <AlertDialogFooter className="mt-4 pt-4 border-t"><AlertDialogCancel>Yopish</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main content */}
      <main className="flex-1 p-3 sm:p-4 overflow-hidden">
        {visibleCategoryCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-lg p-4">
             <Bell className="w-16 h-16 text-gray-300 mb-4" />
            <p>Hech qanday kategoriya tanlanmagan.</p>
            <p className="text-sm mt-1">Iltimos, yuqoridagi filtr orqali kerakli kategoriyalarni tanlang.</p>
          </div>
        ) : (
          <div className={`grid gap-3 sm:gap-4 ${gridColsClass} h-full`}>

            {/* Yangi buyurtmalar */}
            {visibleCategories.new && (
              <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <Collapsible open={openCollapsibles.new} onOpenChange={() => toggleCollapsible("new")} className="flex-1 flex flex-col overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors duration-150 cursor-pointer shrink-0">
                    <h2 className="text-base sm:text-lg font-semibold text-blue-700">Yangi ({filteredOrders("new").length})</h2>
                    {openCollapsibles.new ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex-1 overflow-hidden">
                     <ScrollArea className="h-full w-full">
                        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                            {filteredOrders("new").length === 0 ? ( <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Yangi buyurtmalar yo'q.</div> )
                             : ( filteredOrders("new").map((order) => ( <OrderCard key={`new-${order.id}`} order={order} actionButton={ <Button size="sm" className="w-full bg-blue-500 hover:bg-blue-600 text-white" onClick={() => handleStartPreparing(order.id)}>Tayyorlash</Button> } /> )) )}
                        </div>
                     </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Tayyorlanmoqda buyurtmalar */}
            {visibleCategories.preparing && (
               <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <Collapsible open={openCollapsibles.preparing} onOpenChange={() => toggleCollapsible("preparing")} className="flex-1 flex flex-col overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors duration-150 cursor-pointer shrink-0">
                     <h2 className="text-base sm:text-lg font-semibold text-yellow-700">Tayyorlanmoqda ({filteredOrders("preparing").length})</h2>
                    {openCollapsibles.preparing ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full w-full">
                        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                            {filteredOrders("preparing").length === 0 ? ( <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Tayyorlanayotgan buyurtmalar yo'q.</div> )
                             : ( filteredOrders("preparing").map((order) => ( <OrderCard key={`preparing-${order.id}`} order={order} actionButton={ <Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => handleOrderReady(order.id)}>Tayyor</Button> } /> )) )}
                        </div>
                     </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Mijozga berildi buyurtmalar */}
            {visibleCategories.ready && (
              <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200">
                <Collapsible open={openCollapsibles.ready} onOpenChange={() => toggleCollapsible("ready")} className="flex-1 flex flex-col overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 border-b hover:bg-gray-100 transition-colors duration-150 cursor-pointer shrink-0">
                    <h2 className="text-base sm:text-lg font-semibold text-green-700">Mijozga berildi ({filteredOrders("ready").length})</h2>
                    {openCollapsibles.ready ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full w-full">
                        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
                            {filteredOrders("ready").length === 0 ? ( <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Mijozga beriladigan buyurtmalar yo'q.</div> )
                             : ( filteredOrders("ready").map((order) => ( <OrderCard key={`ready-${order.id}`} order={order} actionButton={ <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleMarkServed(order.id)}>Mijozga Berildi</Button> } /> )) )}
                        </div>
                     </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}