"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import axios from "axios"

// Ikonkalar (o'zgarishsiz)
import { Bell, LogOut, Search, ShoppingBag, ShoppingCart, Truck, Users, Minus, Plus as PlusIcon, History, Eye, Edit, Loader2, X, Save, RotateCcw, CheckCircle, Repeat } from "lucide-react"
// UI Komponentlari (o'zgarishsiz)
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


export default function POSPageWrapper() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000,
        },
    },
  }));


  return (
    <QueryClientProvider client={queryClient}>
      <POSPage />
    </QueryClientProvider>
  )
}


function POSPage() {
  const queryClient = useQueryClient();

  // === Asosiy State'lar ===
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // === O'ng Panel State'lari ===
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [originalOrderItems, setOriginalOrderItems] = useState([]);
  const [isEditLoadingManual, setIsEditLoadingManual] = useState(false);
  const [editErrorManual, setEditErrorManual] = useState(null);
  const [submitEditError, setSubmitEditError] = useState(null);
  const [cart, setCart] = useState([]);

  // === Yangi Buyurtma Uchun Qo'shimcha State'lar ===
  const [orderType, setOrderType] = useState("dine_in")
  const [selectedTable, setSelectedTable] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "+998 ", address: "" }) // <-- Telefonni prefiks bilan boshlaymiz
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');

  // === Dialog Oynalari State'lari ===
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // === Buyurtmalar Tarixi State'lari ===
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState("");

   // Helper function to get token
   const getToken = () => {
    if (typeof window !== "undefined") { return localStorage.getItem("token") }
    return null
  }

  // === React Query So'rovlari ===

  // Kategoriyalarni yuklash
  const { data: categories = [], isLoading: isLoadingCategories, error: errorCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Token topilmadi");
      const res = await axios.get("https://oshxonacopy.pythonanywhere.com/api/categories/", { headers: { Authorization: `Bearer ${token}` } });
      return res.data || [];
    },
    onError: (err) => {
      console.error("Kategoriya xato (RQ):", err);
      toast.error(err.message || "Kategoriyalarni yuklashda xato");
    }
  });

  // Mahsulotlarni yuklash
  const { data: products = [], isLoading: isLoadingProducts, error: errorProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Token topilmadi");
      const res = await axios.get("https://oshxonacopy.pythonanywhere.com/api/products/", { headers: { Authorization: `Bearer ${token}` } });
      return res.data || [];
    },
    onError: (err) => {
      console.error("Mahsulot xato (RQ):", err);
      toast.error(err.message || "Mahsulotlarni yuklashda xato");
    }
  });

  // Stollarni yuklash
  const { data: tables = [], isLoading: isLoadingTables, error: errorTables } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Token topilmadi");
      const res = await axios.get("https://oshxonacopy.pythonanywhere.com/api/tables/", { headers: { Authorization: `Bearer ${token}` } });
      return res.data || [];
    },
    refetchInterval: 5000,
    onError: (err) => {
      console.error("Stol xato (RQ):", err);
    }
  });

  // Tarix qidiruvi uchun debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHistorySearch(historySearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [historySearchQuery]);

  // Buyurtmalar tarixini yuklash
  const {
    data: orderHistory = [],
    isLoading: isHistoryLoading,
    error: historyError,
    refetch: refetchHistory
  } = useQuery({
      queryKey: ['orderHistory', debouncedHistorySearch],
      queryFn: async ({ queryKey }) => {
        const [, searchTerm] = queryKey;
        const token = getToken();
        if (!token) throw new Error("Token topilmadi");
        let url = `https://oshxonacopy.pythonanywhere.com/api/orders/${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        return res.data || [];
      },
      enabled: showHistoryDialog,
      onError: (err) => {
        console.error("Tarix xato (RQ):", err);
        let errorMsg = "Tarixni yuklashda xato";
        if (err.response?.status === 401) errorMsg = "Avtorizatsiya xatosi.";
        else if (err.response?.data) errorMsg = `Server xatosi: ${JSON.stringify(err.response.data)}`;
        else if (err.message) errorMsg = err.message;
        toast.error(errorMsg);
      }
  });

  // === Buyurtmani O'NG PANELDA tahrirlash uchun yuklash ===
  const loadOrderForEditing = async (orderId) => {
    const token = getToken();
    if (!token || !orderId) { toast.error("Tahrirlash uchun ID/token yetarli emas."); return; }
    if (updateOrderItemsMutation.isPending) { toast.warn("Iltimos, avvalgi amal tugashini kuting."); return; }
    if (isEditLoadingManual && editingOrderId === orderId) { return; }

    console.log("Tahrirlash uchun yuklanmoqda (RQ fetchQuery):", orderId);
    setIsEditLoadingManual(true);
    setEditErrorManual(null);
    setOrderToEdit(null);
    setCart([]);
    setEditingOrderId(null);
    setOriginalOrderItems([]);

    try {
      const data = await queryClient.fetchQuery({
         queryKey: ['orderDetails', orderId],
         queryFn: async () => {
           const url = `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/`;
           const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
           if (!res.data) throw new Error(`Buyurtma (${orderId}) uchun ma'lumot topilmadi.`);
           return res.data;
         },
         staleTime: 0
      });

      if (data.status === 'completed' || data.status === 'cancelled') {
          toast.warn(`Buyurtma #${orderId} (${data.status_display}) holatida bo'lgani uchun tahrirlab bo'lmaydi.`);
          setIsEditLoadingManual(false);
          setShowHistoryDialog(true);
          return;
      }

      setOrderToEdit(data);
      setOriginalOrderItems(JSON.parse(JSON.stringify(data.items || [])));
      setEditingOrderId(orderId);
      toast.success(`Buyurtma #${orderId} tahrirlash uchun yuklandi.`);
      setShowHistoryDialog(false);

    } catch (err) {
      console.error(`Buyurtma (${orderId}) tahrirlashga yuklash xato (RQ):`, err);
      let errorMsg = `Buyurtma (${orderId}) tahrirlashga yuklashda xato`;
      if (err.response?.status === 401) errorMsg = "Avtorizatsiya xatosi.";
      else if (err.response?.status === 404) errorMsg = `Buyurtma (${orderId}) topilmadi.`;
      else if (err.response?.data) errorMsg = `Server xatosi: ${JSON.stringify(err.response.data)}`;
      else if (err.message) errorMsg = err.message;

      setEditErrorManual(errorMsg);
      toast.error(errorMsg);
      setEditingOrderId(null);
      setOriginalOrderItems([]);
      setShowHistoryDialog(true);
    } finally {
       setIsEditLoadingManual(false);
    }
  };


  // === Lokal State O'zgarishlari ===
  const handleLocalEditQuantityChange = (productId, change) => {
      if (!editingOrderId || !orderToEdit || updateOrderItemsMutation.isPending) return;

      setOrderToEdit(prevOrder => {
          if (!prevOrder) return null;
          const updatedItems = [...prevOrder.items];
          const itemIndex = updatedItems.findIndex(item => item.product === productId);

          if (itemIndex > -1) {
              const currentItem = updatedItems[itemIndex];
              const newQuantity = currentItem.quantity + change;
              if (newQuantity <= 0) {
                  updatedItems.splice(itemIndex, 1);
              } else {
                  updatedItems[itemIndex] = { ...currentItem, quantity: newQuantity };
              }
          }
          return { ...prevOrder, items: updatedItems };
      });
  };

  const handleLocalAddItemFromProductList = (product) => {
      if (!editingOrderId || !orderToEdit || !product || updateOrderItemsMutation.isPending || isEditLoadingManual) return;

      setOrderToEdit(prevOrder => {
          if (!prevOrder) return null;
          const updatedItems = [...prevOrder.items];
          const itemIndex = updatedItems.findIndex(item => item.product === product.id);

          if (itemIndex > -1) {
              updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: updatedItems[itemIndex].quantity + 1 };
          } else {
              updatedItems.push({
                  id: `temp-${Date.now()}-${product.id}`,
                  product: product.id,
                  product_details: { id: product.id, name: product.name, image_url: product.image },
                  quantity: 1,
                  unit_price: product.price,
                  total_price: product.price
              });
          }
          return { ...prevOrder, items: updatedItems };
      });
  };

  // === React Query Mutations ===

  // --- YANGI BUYURTMA YARATISH MUTATION ---
  const createOrderMutation = useMutation({
      mutationFn: async (orderData) => {
        const token = getToken();
        if (!token) throw new Error("Avtorizatsiya tokeni topilmadi!");
        const dataToSend = { ...orderData };
        if (dataToSend.customer_phone) {
            dataToSend.customer_phone = dataToSend.customer_phone.replace(/\D/g, '');
        }
        console.log("APIga yuborilayotgan ma'lumot:", dataToSend);
        const res = await axios.post("https://oshxonacopy.pythonanywhere.com/api/orders/", dataToSend, { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
      },
      onSuccess: (data, variables) => {
        toast.success('Buyurtma muvaffaqiyatli yaratildi!');
        setCart([]);
        setCustomerInfo({ name: "", phone: "+998 ", address: "" }); // <-- Telefonni prefiksga qaytaramiz
        setSelectedTable(null);
        setShowCustomerDialog(false);
        setShowTableDialog(false);
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        if (showHistoryDialog) {
          queryClient.invalidateQueries({ queryKey: ['orderHistory'] });
        }
      },
      onError: (error, variables) => {
        console.error("Yangi buyurtma xato (RQ Mutation):", error.response || error);
        let msg = "Noma'lum xato!";
        if (error.response?.data) {
          try {
            const errorData = error.response.data;
            if(typeof errorData === 'string') msg=errorData;
            else if(errorData.detail) msg=errorData.detail;
            else if (errorData.customer_phone && Array.isArray(errorData.customer_phone)) {
                 msg = `Telefon raqami: ${errorData.customer_phone.join(', ')}`;
             }
            else if(errorData.table_id && Array.isArray(errorData.table_id) && errorData.table_id[0]?.includes('is already occupied')) {
                queryClient.invalidateQueries({ queryKey: ['tables'] });
                const tableName = queryClient.getQueryData(['tables'])?.find(t=>t.id===variables.table_id)?.name || variables.table_id;
                msg=`Stol ${tableName} hozirda band.`;
            }
            else if(typeof errorData === 'object') msg=Object.entries(errorData).map(([k,v])=>`${k}:${Array.isArray(v)?v.join(','):v}`).join(';');
          } catch (e) { console.error("Error parsing error data:", e); }
        } else if (error.response?.status) {
          msg = `Server xatosi (${error.response.status})`;
        } else if (error.message) {
          msg = error.message;
        }
        toast.error(`Xatolik: ${msg}`);
      }
  });

  // --- TAHRIRLANGAN BUYURTMANI SAQLASH MUTATION ---
  const updateOrderItemsMutation = useMutation({
      mutationFn: async ({ orderId, payload }) => {
        const token = getToken();
        if (!token) throw new Error("Avtorizatsiya tokeni topilmadi!");
        const url = `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/update-items/`;
        const res = await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        return res.data;
      },
      onMutate: () => {
        setSubmitEditError(null);
      },
      onSuccess: (data, variables) => {
        toast.success(`Buyurtma #${variables.orderId} muvaffaqiyatli yangilandi!`);
        finishEditingInternal();
        queryClient.invalidateQueries({ queryKey: ['orderDetails', variables.orderId] });
        refetchHistory();
      },
      onError: (error, variables) => {
        console.error("API xatosi (RQ Update Mutation):", error.response || error);
        let errorMsg = "O'zgarishlarni saqlashda xato yuz berdi.";
        if (error.response) {
            const { status, data } = error.response;
            if (status === 400) {
                if (data?.detail) { errorMsg = data.detail; }
                else if (data?.items_operations && Array.isArray(data.items_operations)) {
                    const opErrors = data.items_operations
                      .map((opError, index) => {
                          if (opError && typeof opError === 'object' && Object.keys(opError).length > 0) {
                              const failedOp = variables.payload.items_operations[index] || {};
                              const errorDetails = Object.entries(opError)
                                    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                                    .join('; ');
                              return `Operatsiya ${index + 1} (${failedOp.operation || 'noma\'lum'}): ${errorDetails}`;
                          }
                          return null;
                      })
                      .filter(Boolean);
                    if (opErrors.length > 0) {
                        errorMsg = `Operatsiya xatoliklari: ${opErrors.join('. ')}`;
                    } else {
                         errorMsg = "Validatsiya xatosi (noma'lum).";
                    }
                }
                else if (typeof data === 'object') {
                     errorMsg = Object.entries(data)
                       .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                       .join('; ');
                }
                else { errorMsg = `Validatsiya xatosi: ${JSON.stringify(data)}`; }
            } else if (status === 401) { errorMsg = "Avtorizatsiya xatosi."; }
            else if (status === 403) { errorMsg = "Ruxsat yo'q."; }
            else if (status === 404) { errorMsg = "Buyurtma yoki so'ralgan element topilmadi."; }
            else { errorMsg = `Server xatosi (${status}): ${JSON.stringify(data)}`; }
        } else { errorMsg = `Ulanish xatosi: ${error.message}`; }
        setSubmitEditError(errorMsg);
        toast.error(errorMsg, { autoClose: 7000 });
      },
  });

  // --- QAYTA BUYURTMA BERISH MUTATION ---
  const reorderMutation = useMutation({
      mutationFn: async (orderData) => {
        const token = getToken();
        if (!token) throw new Error("Avtorizatsiya tokeni topilmadi!");
        const dataToSend = { ...orderData };
        if (dataToSend.customer_phone) {
            dataToSend.customer_phone = dataToSend.customer_phone.replace(/\D/g, '');
        }
        console.log("Qayta buyurtma APIga yuborilmoqda:", dataToSend);
        const res = await axios.post("https://oshxonacopy.pythonanywhere.com/api/orders/", dataToSend, { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
      },
      onSuccess: (data, variables) => {
        toast.success(`Buyurtma #${variables.originalOrderId} dan nusxa muvaffaqiyatli yaratildi!`);
        setCart([]);
        setOrderType('dine_in');
        setSelectedTable(null);
        setCustomerInfo({ name: "", phone: "+998 ", address: "" }); // <-- Prefiksga qaytaramiz
        finishEditingInternal();
        setShowHistoryDialog(false);
        queryClient.invalidateQueries({ queryKey: ['tables'] });
      },
      onError: (error, variables) => {
        console.error("Qayta buyurtma xato (RQ Mutation):", error.response || error);
        let msg = "Noma'lum xato!";
        if (error.response?.data) {
          try {
            const errorData = error.response.data;
             if(typeof errorData === 'string') msg=errorData;
             else if(errorData.detail) msg=errorData.detail;
             else if (errorData.customer_phone && Array.isArray(errorData.customer_phone)) {
                 msg = `Telefon raqami: ${errorData.customer_phone.join(', ')}`;
             }
             else if (errorData.table_id && Array.isArray(errorData.table_id) && errorData.table_id[0]?.includes('is already occupied')) {
                 queryClient.invalidateQueries({ queryKey: ['tables'] });
                 const originalOrder = variables.originalOrderData;
                 msg = `Stol ${originalOrder?.table_name || originalOrder?.table_id} hozirda band.`;
             }
             else if (typeof errorData === "object") msg = Object.entries(errorData).map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(",") : v}`).join(";");
          } catch (e) { console.error("Error parsing reorder error:", e); }
        } else if (error.response?.status) {
          msg = `Server xatosi (${error.response.status})`;
        } else if (error.message) {
          msg = error.message;
        }
        toast.error(`Xatolik: ${msg}`);
        if (error.response?.data?.table_id) {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        }
      }
  });


  // === Mavjud Funksiyalarni Yangilash ===

  const submitOrder = () => {
     if (editingOrderId) return;
     if (cart.length === 0) { toast.warn("Savat bo‘sh!"); return; }
     if (orderType === "dine_in" && !selectedTable) { toast.warn("Stol tanlang!"); setShowTableDialog(true); return; }
     if ((orderType === "takeaway" || orderType === "delivery") && (!customerInfo.name || !customerInfo.phone)) { setShowCustomerDialog(true); toast.warn("Mijoz nomi va raqamini kiriting!"); return; }
     // Telefon raqami faqat prefiksdan iborat emasligini tekshirish
     if ((orderType === "takeaway" || orderType === "delivery") && customerInfo.phone.trim() === "+998") {
        setShowCustomerDialog(true);
        toast.warn("Telefon raqamini kiriting!");
        return;
     }
     if (orderType === "delivery" && !customerInfo.address) { setShowCustomerDialog(true); toast.warn("Yetkazish manzilini kiriting!"); return; }

    const orderData = {
      order_type: orderType,
      table_id: orderType === "dine_in" ? selectedTable : null,
      customer_name: (orderType === "takeaway" || orderType === "delivery") ? customerInfo.name : null,
      customer_phone: (orderType === "takeaway" || orderType === "delivery") ? customerInfo.phone : null,
      customer_address: orderType === "delivery" ? customerInfo.address : null,
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    }
    createOrderMutation.mutate(orderData);
  }

  const submitEditedOrderChanges = () => {
    if (!editingOrderId || !orderToEdit || !originalOrderItems || updateOrderItemsMutation.isPending || isEditLoadingManual) {
      toast.warn("Hozirda o'zgarishlarni saqlash mumkin emas.");
      return;
    }

    const currentItems = orderToEdit.items || [];
    const operations = [];
    currentItems.forEach((currentItem) => {
      const originalItem = originalOrderItems.find((o) => o.product === currentItem.product);
      if (!originalItem) {
        operations.push({ operation: "add", product_id: currentItem.product, quantity: currentItem.quantity });
      }
    });
    originalOrderItems.forEach((originalItem) => {
      const currentItem = currentItems.find((c) => c.product === originalItem.product);
      if (currentItem) {
        if (currentItem.quantity !== originalItem.quantity) {
          if (originalItem.id && typeof originalItem.id === 'number') {
            operations.push({ operation: "set", order_item_id: originalItem.id, quantity: currentItem.quantity });
          } else { console.warn(`Set uchun OrderItemID yo'q: ${originalItem.product}`);}
        }
      } else {
         if (originalItem.id && typeof originalItem.id === 'number') {
           operations.push({ operation: "remove", order_item_id: originalItem.id });
         } else { console.warn(`Remove uchun OrderItemID yo'q: ${originalItem.product}`);}
      }
    });


    if (operations.length === 0) {
      toast.info("Hech qanday o'zgarish qilinmadi.");
      finishEditingInternal();
      return;
    }

    const payload = { items_operations: operations };
    console.log("API so'rovi yuborilmoqda (RQ Mutate):", JSON.stringify(payload, null, 2));
    updateOrderItemsMutation.mutate({ orderId: editingOrderId, payload });
  };


  const reorderToSameTable = (order) => {
    if (editingOrderId || isEditLoadingManual || updateOrderItemsMutation.isPending || reorderMutation.isPending || createOrderMutation.isPending) {
        toast.warn("Iltimos, avval boshqa amallarni yakunlang.");
        return;
    }
    if (order.status !== "completed") { toast.warn("Bu funksiya faqat tayyor (completed) buyurtmalar uchun ishlaydi."); return; }
    if (!order.table_id && order.order_type === "dine_in") { toast.error("Stol ma'lumotlari topilmadi. Qayta buyurtma berish mumkin emas."); return; }

    const orderData = {
      order_type: order.order_type,
      table_id: order.order_type === "dine_in" ? order.table_id : null,
      customer_name: (order.order_type === "takeaway" || order.order_type === "delivery") ? order.customer_name : null,
      customer_phone: (order.order_type === "takeaway" || order.order_type === "delivery") ? order.customer_phone : null,
      customer_address: order.order_type === "delivery" ? order.customer_address : null,
      items: order.items.map((item) => ({ product_id: item.product, quantity: item.quantity })),
    };
    reorderMutation.mutate({ ...orderData, originalOrderId: order.id, originalOrderData: order });
  };


  // === Qolgan Funksiyalar ===

  const addToCart = (product) => {
     if (editingOrderId) return;
     if (!product?.id) { toast.error("Mahsulot qo'shishda xatolik."); return; }
     setCart((prev) => {
        const exist = prev.find((i) => i.id === product.id);
        if (exist) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        else return [...prev, { id: product.id, product: product, quantity: 1 }];
    });
  }

  const decreaseQuantity = (item) => {
     if (editingOrderId) return;
     if (!item?.id) return;
     setCart((prev) => {
        const current = prev.find((i) => i.id === item.id);
        if (!current) return prev;
        if (current.quantity === 1) return prev.filter((i) => i.id !== item.id);
        else return prev.map((i) => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i);
     });
  }

  const increaseQuantity = (item) => {
     if (editingOrderId) return;
     if (!item?.id) return;
     setCart((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
  }

  // Mijoz ma'lumotlarini saqlash funksiyasi (telefon raqami validatsiyasi)
  const handleCustomerInfoSave = () => {
     if (!customerInfo.name || !customerInfo.phone) { toast.warn("Ism va raqamni kiriting!"); return; }
     // Telefon raqami faqat prefiksdan iborat emasligini tekshirish
     if (customerInfo.phone.trim() === "+998") {
         toast.warn("Telefon raqamini to'liq kiriting!");
         return;
     }
     if (orderType === "delivery" && !customerInfo.address) { toast.warn("Manzilni kiriting!"); return; }
    setShowCustomerDialog(false); toast.info("Mijoz ma'lumotlari kiritildi.");
  }

   // +998 prefiksini boshqarish uchun YANGILANGAN funksiya
   const handlePhoneChange = (e) => {
      const prefix = "+998 ";
      let newValue = e.target.value;
      let cursorPosition = e.target.selectionStart; // Kursor pozitsiyasini olish

      // Agar qiymat prefiks bilan boshlanmasa yoki qisqaroq bo'lsa
      if (!newValue.startsWith(prefix) || newValue.length < prefix.length) {
          // Prefiksni tiklaymiz
          newValue = prefix;
          // Kursorni prefiksdan keyinga qo'yamiz
          // setTimeout yordamida, chunki state yangilanishi asinxron
          setTimeout(() => {
              e.target.selectionStart = prefix.length;
              e.target.selectionEnd = prefix.length;
          }, 0);

      } else {
          // Prefiksdan keyingi qismni olamiz
          const numberPart = newValue.substring(prefix.length);
          // Faqat raqamlarni qoldiramiz
          const digitsOnly = numberPart.replace(/\D/g, '');

          // Yangi qiymatni yig'amiz
          newValue = prefix + digitsOnly;

          // Maksimal uzunlikni cheklash (9 raqam prefiksdan keyin)
          const maxDigits = 9;
          if (digitsOnly.length > maxDigits) {
              newValue = prefix + digitsOnly.substring(0, maxDigits);
          }

          // Kursor prefiks ichiga tushib qolishini oldini olish
          if (cursorPosition < prefix.length) {
              cursorPosition = prefix.length;
               // setTimeout yordamida kursor pozitsiyasini to'g'rilash
               setTimeout(() => {
                    e.target.selectionStart = cursorPosition;
                    e.target.selectionEnd = cursorPosition;
               }, 0);
          }
      }

      // State'ni yangilaymiz
      setCustomerInfo(prev => ({ ...prev, phone: newValue }));
   };


  const finishEditingInternal = () => {
      const previousId = editingOrderId;
      setEditingOrderId(null);
      setOrderToEdit(null);
      setOriginalOrderItems([]);
      setIsEditLoadingManual(false);
      setEditErrorManual(null);
      setSubmitEditError(null);
      setCart([]);
      if (showHistoryDialog && previousId) {
         setTimeout(() => refetchHistory(), 100);
      }
  }

   const cancelEditing = () => {
     if (updateOrderItemsMutation.isPending) {
         toast.warn("Yakuniy saqlash jarayoni ketmoqda, bekor qilib bo'lmaydi.");
         return;
     }
     const previousId = editingOrderId;
     if (previousId) { toast.info(`Buyurtma #${previousId} tahrirlash bekor qilindi.`); }
     finishEditingInternal();
   }

  const handleLogout = () => {
      if (typeof window !== "undefined") { localStorage.removeItem("token"); window.location.href = "/auth"; toast.info("Tizimdan chiqildi");}
  }
  const formatDateTime = (d) => {
     if (!d) return "N/A"; try { return new Date(d).toLocaleString('uz-UZ', { year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false }); } catch (e) { return d; }
  };

  // === Memoized Qiymatlar ===
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      if (!p.is_active) return false;
      const nameMatch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const catMatch = selectedCategory === null || p.category?.id === selectedCategory;
      return nameMatch && catMatch;
    });
  }, [products, selectedCategory, searchQuery]);

  const uniqueZones = useMemo(() => {
     if (!Array.isArray(tables)) return ['all'];
     const zones = tables.map(t => t.zone || 'N/A');
     const uniqueSet = new Set(zones);
     const sortedZones = Array.from(uniqueSet).sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA) && isNaN(numB)) return -1;
        if (isNaN(numA) && !isNaN(numB)) return 1;
        return a.localeCompare(b);
     });
     return ['all', ...sortedZones];
  }, [tables]);


   // === O'ng panel uchun joriy itemlar va summa ===
   const currentPanelItems = useMemo(() => {
       if (editingOrderId && orderToEdit?.items) {
           return orderToEdit.items;
       } else if (!editingOrderId) {
           return cart;
       } else {
           return [];
       }
   }, [editingOrderId, orderToEdit, cart]);

   const currentPanelTotal = useMemo(() => {
       if (editingOrderId && orderToEdit?.items) {
           return orderToEdit.items.reduce((sum, item) => {
               const price = Number(item.unit_price) || 0;
               return sum + (price * item.quantity);
           }, 0);
       } else if (!editingOrderId) {
           return cart.reduce((total, item) => {
               const price = parseFloat(item.product?.price) || 0;
               return total + (price * item.quantity);
           }, 0);
       } else {
           return 0;
       }
   }, [editingOrderId, orderToEdit, cart]);


  // === UI QISMI (RETURN) ===
  return (
    <TooltipProvider>
        <div className="flex h-screen flex-col bg-muted/40">
            <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored"/>

            {/* Header (o'zgarishsiz) */}
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:px-6 shrink-0">
                 <div className="flex items-center gap-2 sm:gap-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowLogoutDialog(true)}>
                                <LogOut className="h-5 w-5" />
                                <span className="sr-only">Chiqish</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Tizimdan Chiqish</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={() => { setHistorySearchQuery(''); setDebouncedHistorySearch(''); setShowHistoryDialog(true); }}>
                                <History className="h-5 w-5" />
                                <span className="sr-only">Buyurtmalar Tarixi</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Buyurtmalar Tarixi</p></TooltipContent>
                    </Tooltip>
                    <h1 className="text-lg sm:text-xl font-bold hidden md:inline-block">SmartResto POS</h1>
                </div>
                 <div className="flex-1 flex justify-center px-4">
                     <Tabs
                        value={editingOrderId ? '' : orderType}
                        onValueChange={editingOrderId ? () => {} : setOrderType}
                        className={`w-full max-w-md ${editingOrderId || createOrderMutation.isPending || updateOrderItemsMutation.isPending || reorderMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                         <TabsList className="grid w-full grid-cols-3 h-11">
                             <TabsTrigger value="dine_in" disabled={!!editingOrderId || createOrderMutation.isPending || updateOrderItemsMutation.isPending || reorderMutation.isPending} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                 <Users className="h-4 w-4" /> <span className="hidden sm:inline">Shu yerda</span><span className="sm:hidden">Ichkarida</span>
                             </TabsTrigger>
                             <TabsTrigger value="takeaway" disabled={!!editingOrderId || createOrderMutation.isPending || updateOrderItemsMutation.isPending || reorderMutation.isPending} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                 <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Olib ketish</span><span className="sm:hidden">Olib k.</span>
                             </TabsTrigger>
                             <TabsTrigger value="delivery" disabled={!!editingOrderId || createOrderMutation.isPending || updateOrderItemsMutation.isPending || reorderMutation.isPending} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                 <Truck className="h-4 w-4" /> <span className="hidden sm:inline">Yetkazish</span><span className="sm:hidden">Yetkaz.</span>
                             </TabsTrigger>
                         </TabsList>
                     </Tabs>
                 </div>
                 <div className="flex items-center gap-2 sm:gap-4"> {/* Bildirishnomalar */} </div>
            </header>

            {/* Asosiy Kontent */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-0 overflow-hidden">

                {/* Chap taraf - Mahsulotlar */}
                <div className="md:col-span-2 lg:col-span-3 flex flex-col border-r border-border overflow-hidden">
                    {/* Qidiruv va Kategoriyalar */}
                    <div className="border-b border-border p-4 shrink-0">
                         <div className="relative mb-4">
                             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                             <Input type="search" placeholder="Mahsulotlarni qidirish..." className="w-full rounded-lg bg-background pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                         </div>
                        <ScrollArea className="w-full">
                            <div className="flex space-x-2 pb-2">
                                <Button size="sm" variant={selectedCategory === null ? "default" : "outline"} className="rounded-full whitespace-nowrap px-4" onClick={() => setSelectedCategory(null)}>Barchasi</Button>
                                {isLoadingCategories ? (
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground p-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Yuklanmoqda...</span></div>
                                ) : errorCategories ? (
                                    <p className="text-sm text-destructive p-2">{errorCategories instanceof Error ? errorCategories.message : "Kategoriya xatosi"}</p>
                                ) : (
                                    Array.isArray(categories) && categories.map((category) => (
                                        <Button size="sm" key={category.id} variant={selectedCategory === category.id ? "default" : "outline"} className="rounded-full whitespace-nowrap px-4" onClick={() => setSelectedCategory(category.id)}>{category.name}</Button>
                                    ))
                                )}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>

                    {/* Mahsulotlar Ro'yxati */}
                    <ScrollArea className="flex-1 p-4">
                        {isLoadingProducts ? (
                            <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground ml-2">Mahsulotlar yuklanmoqda...</p></div>
                        ) : errorProducts ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                                <p className="text-destructive mb-4">{errorProducts instanceof Error ? errorProducts.message : "Mahsulotlarni yuklashda xatolik"}</p>
                                <Button onClick={() => queryClient.refetchQueries({ queryKey: ['products'] })}>Qayta yuklash</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                                {filteredProducts.length === 0 ? (
                                    <div className="col-span-full flex h-60 items-center justify-center text-muted-foreground text-center p-4">
                                        <p>"{searchQuery}" {selectedCategory ? `uchun "${categories.find(c=>c.id===selectedCategory)?.name}"` : ''} kategoriyasida aktiv mahsulot topilmadi.</p>
                                    </div>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <Card
                                            key={product.id}
                                            className={`cursor-pointer overflow-hidden transition-all hover:shadow-lg active:scale-95 flex flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm group ${updateOrderItemsMutation.isPending || createOrderMutation.isPending || reorderMutation.isPending || isEditLoadingManual ? 'opacity-70 pointer-events-none' : ''}`}
                                            onClick={() => {
                                                if (updateOrderItemsMutation.isPending || createOrderMutation.isPending || reorderMutation.isPending || isEditLoadingManual) return;
                                                if (editingOrderId) { handleLocalAddItemFromProductList(product); }
                                                else { addToCart(product); }
                                            }}
                                        >
                                             <CardContent className="p-0 flex-1 flex flex-col">
                                                 <div className="aspect-square w-full overflow-hidden relative"> <img src={product.image || "/placeholder-product.jpg"} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105" onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }} loading="lazy" /> </div>
                                                 <div className="p-3 flex-grow flex flex-col justify-between">
                                                     <div> <h3 className="font-semibold text-sm sm:text-base line-clamp-2" title={product.name}>{product.name}</h3> </div>
                                                     <p className="text-xs sm:text-sm font-semibold text-primary mt-1"> {Number(product.price).toLocaleString('uz-UZ')} so‘m </p>
                                                 </div>
                                             </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* O'ng taraf - Savat / Tahrirlash Paneli */}
                <div className="md:col-span-1 lg:col-span-2 flex flex-col bg-background overflow-hidden">
                    {/* Panel Sarvlavhasi */}
                    <div className="flex items-center justify-between border-b border-border p-4 shrink-0 h-16">
                         <div className="flex items-center space-x-2">
                             {isEditLoadingManual ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : editingOrderId ? <Edit className="h-5 w-5 text-primary" /> : <ShoppingCart className="h-5 w-5 text-muted-foreground" />}
                             <h2 className="text-lg font-medium">
                                 {isEditLoadingManual ? "Yuklanmoqda..." : editingOrderId ? `Tahrirlash #${editingOrderId}` : "Yangi Buyurtma"}
                             </h2>
                         </div>
                         <div className="flex items-center gap-2">
                             {editingOrderId && !isEditLoadingManual && orderToEdit ? (
                                 <>
                                     {orderToEdit.table && <Tooltip><TooltipTrigger asChild><Badge variant="outline" className="text-sm px-2 py-1">Stol {orderToEdit.table.name}</Badge></TooltipTrigger><TooltipContent><p>Joy: {orderToEdit.table.zone || 'N/A'}</p></TooltipContent></Tooltip>}
                                     {orderToEdit.customer_name && <Tooltip><TooltipTrigger asChild><Badge variant="secondary" className="text-xs px-2 py-1 max-w-[100px] truncate"><Users className="h-3 w-3 mr-1"/>{orderToEdit.customer_name}</Badge></TooltipTrigger><TooltipContent><p>{orderToEdit.customer_name}</p><p>{orderToEdit.customer_phone}</p>{orderToEdit.customer_address && <p>{orderToEdit.customer_address}</p>}</TooltipContent></Tooltip>}
                                     <Tooltip>
                                         <TooltipTrigger asChild>
                                             <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={updateOrderItemsMutation.isPending || isEditLoadingManual}>
                                                 <X className="h-5 w-5 text-destructive" />
                                             </Button>
                                         </TooltipTrigger>
                                         <TooltipContent><p>Tahrirlashni Bekor Qilish</p></TooltipContent>
                                     </Tooltip>
                                 </>
                             ) : !editingOrderId ? (
                                 <>
                                     {orderType === "dine_in" && (
                                         <>
                                             {selectedTable && <Badge variant="outline" className="text-sm px-2 py-1 whitespace-nowrap">Stol {tables?.find((t) => t.id === selectedTable)?.name || selectedTable}</Badge>}
                                             <Button variant="outline" size="sm" onClick={() => setShowTableDialog(true)} className="whitespace-nowrap" disabled={isLoadingTables}> {selectedTable ? "O‘zgartirish" : "Stol tanlash"} </Button>
                                         </>
                                     )}
                                     {(orderType === 'takeaway' || orderType === 'delivery') && customerInfo.name && <Tooltip><TooltipTrigger asChild><Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap truncate max-w-[100px] cursor-pointer" onClick={() => setShowCustomerDialog(true)}> <Users className="h-3 w-3 mr-1" /> {customerInfo.name.split(' ')[0]} </Badge></TooltipTrigger><TooltipContent><p>{customerInfo.name}, {customerInfo.phone}</p>{orderType === 'delivery' && <p>{customerInfo.address}</p>}<p className="text-xs text-muted-foreground">(O'zgartirish uchun bosing)</p></TooltipContent></Tooltip>}
                                     {(orderType === 'takeaway' || orderType === 'delivery') && !customerInfo.name && <Button variant="outline" size="sm" onClick={() => setShowCustomerDialog(true)}>Mijoz kiritish</Button>}
                                 </>
                             ) : null}
                         </div>
                    </div>

                    {/* Panel Kontenti */}
                    <ScrollArea className="flex-1 p-4">
                         {isEditLoadingManual ? (
                             <div className="flex h-full items-center justify-center text-muted-foreground"> <Loader2 className="h-8 w-8 animate-spin mr-2" /> Buyurtma yuklanmoqda... </div>
                         ) : editErrorManual ? (
                             <div className="flex h-full flex-col items-center justify-center text-destructive p-4 text-center">
                                 <p className="mb-3">{editErrorManual}</p>
                                 <Button variant="outline" size="sm" onClick={() => loadOrderForEditing(editingOrderId)} disabled={isEditLoadingManual || updateOrderItemsMutation.isPending}> <RotateCcw className="mr-2 h-4 w-4"/> Qayta Urinish </Button>
                             </div>
                         ) : currentPanelItems.length === 0 ? (
                              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
                                   <ShoppingCart className="mb-4 h-16 w-16 text-gray-400" />
                                   <h3 className="text-lg font-semibold">{editingOrderId ? "Buyurtmada mahsulot yo'q" : "Savat bo‘sh"}</h3>
                                   <p className="text-sm mt-1">{editingOrderId ? "Chapdan mahsulot tanlab qo'shing" : "Yangi buyurtma uchun mahsulot tanlang"}</p>
                               </div>
                         ) : (
                            <div className="space-y-3">
                                {currentPanelItems.map((item) => {
                                     const productInfo = editingOrderId ? item.product_details : item.product;
                                     const productName = productInfo?.name;
                                     const productImage = editingOrderId ? productInfo?.image_url : productInfo?.image;
                                     const unitPrice = editingOrderId ? item.unit_price : productInfo?.price;
                                     const productId = editingOrderId ? item.product : item.id;
                                     const itemKey = editingOrderId ? (item.id || `item-${item.product}`) : item.id;

                                    return (
                                        <div key={itemKey} className={`flex items-center justify-between space-x-2 border-b border-border pb-3 last:border-b-0 ${updateOrderItemsMutation.isPending ? 'opacity-70' : ''}`}>
                                             <div className="flex items-center gap-3 flex-1 min-w-0">
                                                 <img src={productImage || "/placeholder-product.jpg"} alt={productName || 'Mahsulot'} className="h-10 w-10 rounded-md object-cover shrink-0" onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }} />
                                                 <div className="flex-1 min-w-0"> <h3 className="font-medium text-sm truncate" title={productName}>{productName || `ID: ${productId}`}</h3> <p className="text-xs text-muted-foreground"> {Number(unitPrice || 0).toLocaleString('uz-UZ')} so‘m </p> </div>
                                             </div>
                                            <div className="flex items-center space-x-1 shrink-0">
                                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => editingOrderId ? handleLocalEditQuantityChange(productId, -1) : decreaseQuantity(item)} disabled={updateOrderItemsMutation.isPending || isEditLoadingManual} aria-label="Kamaytirish"> <Minus className="h-3.5 w-3.5" /> </Button>
                                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => editingOrderId ? handleLocalEditQuantityChange(productId, 1) : increaseQuantity(item)} disabled={updateOrderItemsMutation.isPending || isEditLoadingManual} aria-label="Oshirish"> <PlusIcon className="h-3.5 w-3.5" /> </Button>
                                            </div>
                                             <div className="text-right shrink-0 w-24"> <p className="font-semibold text-sm"> {(Number(unitPrice || 0) * item.quantity).toLocaleString('uz-UZ')} so‘m </p> </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                         {submitEditError && ( <p className="text-center text-destructive text-xs mt-4 p-2 bg-destructive/10 rounded">{submitEditError}</p> )}
                    </ScrollArea>

                    {/* Panel Footer */}
                    <div className="border-t border-border p-4 shrink-0 bg-muted/20">
                         <div className="space-y-2 mb-4 text-sm">
                             <div className="flex justify-between"> <span className="text-muted-foreground">Jami (mahsulotlar):</span> <span className="font-semibold"> {currentPanelTotal.toLocaleString('uz-UZ')} so‘m </span> </div>
                             {editingOrderId && orderToEdit && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Holati:</span>
                                        <Badge variant={ orderToEdit.status === 'completed' ? 'success' : orderToEdit.status === 'cancelled' ? 'destructive' : 'outline' } className="capitalize">
                                            {orderToEdit.status_display || orderToEdit.status}
                                        </Badge>
                                    </div>
                                     {Number(orderToEdit.service_fee_percent || 0) > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Xizmat haqi:</span><span>{orderToEdit.service_fee_percent}%</span></div>}
                                     {Number(orderToEdit.tax_percent || 0) > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Soliq:</span><span>{orderToEdit.tax_percent}%</span></div>}
                                     {orderToEdit.final_price && currentPanelTotal !== Number(orderToEdit.final_price) && (
                                          <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                             <span className="text-muted-foreground">Yakuniy Narx:</span>
                                             <span>{Number(orderToEdit.final_price).toLocaleString('uz-UZ')} so‘m</span>
                                          </div>
                                     )}
                                </>
                             )}
                         </div>
                        {/* Asosiy tugma */}
                        {editingOrderId ? (
                            <Button
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                                onClick={submitEditedOrderChanges}
                                disabled={updateOrderItemsMutation.isPending || isEditLoadingManual || currentPanelItems.length === 0 || !!editErrorManual}
                                variant="default"
                            >
                                {updateOrderItemsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                O'zgarishlarni Saqlash
                            </Button>
                        ) : (
                            <Button
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                                onClick={submitOrder}
                                disabled={
                                    createOrderMutation.isPending || isLoadingProducts ||
                                    cart.length === 0 ||
                                    (orderType === 'dine_in' && !selectedTable) ||
                                    ((orderType === 'takeaway' || orderType === 'delivery') && (!customerInfo.name || !customerInfo.phone)) ||
                                    // Prefiksni hisobga olgan holda minimal uzunlik tekshiruvi
                                    ((orderType === 'takeaway' || orderType === 'delivery') && customerInfo.phone.trim() === "+998") ||
                                    (orderType === 'delivery' && !customerInfo.address)
                                }
                            >
                                 {createOrderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Buyurtma Berish ({currentPanelTotal.toLocaleString('uz-UZ')} so‘m)
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stol tanlash dialogi */}
            <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                 <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
                     <DialogHeader> <DialogTitle>Stol tanlash</DialogTitle> <DialogDescription>Yangi buyurtma uchun stol raqamini tanlang.</DialogDescription> </DialogHeader>
                     <div className="mb-4 flex items-center gap-4 px-6 pt-4">
                         <Label htmlFor="zone-filter-select" className="shrink-0 text-sm">Zona bo'yicha filtr:</Label>
                         <Select value={selectedZoneFilter} onValueChange={setSelectedZoneFilter}>
                             <SelectTrigger id="zone-filter-select" className="w-full sm:w-[200px]"> <SelectValue placeholder="Zonani tanlang" /> </SelectTrigger>
                             <SelectContent>
                                 {uniqueZones.map(zone => ( <SelectItem key={zone} value={zone}> {zone === 'all' ? 'Barcha zonalar' : zone === 'N/A' ? 'Zonasiz' : zone} </SelectItem> ))}
                             </SelectContent>
                         </Select>
                     </div>

                     <div className="px-6 pb-4">
                         {isLoadingTables ? (
                             <div className="flex justify-center items-center h-40"> <Loader2 className="h-6 w-6 animate-spin text-primary" /> <p className="text-muted-foreground ml-2">Stollar yuklanmoqda...</p> </div>
                         ) : errorTables ? (
                             <div className="flex justify-center items-center h-40 text-destructive">
                                  <p>{errorTables instanceof Error ? errorTables.message : "Stollarni yuklashda xatolik"}</p>
                                  <Button variant="link" className="ml-2" onClick={() => queryClient.refetchQueries({ queryKey: ['tables'] })}>Qayta urinish</Button>
                              </div>
                         ) : !Array.isArray(tables) || tables.filter(table => selectedZoneFilter === 'all' || (table.zone || 'N/A') === selectedZoneFilter).length === 0 ? (
                             <p className="col-span-full text-center text-muted-foreground py-10">
                                 {selectedZoneFilter === 'all' ? 'Stollar topilmadi.' : `"${selectedZoneFilter === 'N/A' ? 'Zonasiz' : selectedZoneFilter}" zonasi uchun stol topilmadi.`}
                                 {selectedZoneFilter !== 'all' && <Button variant="link" className="ml-2 p-0 h-auto" onClick={()=>setSelectedZoneFilter('all')}>Barchasini ko'rsatish</Button>}
                             </p>
                         ) : (
                             <ScrollArea className="max-h-[60vh] pr-3">
                                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 mt-4">
                                     {tables
                                         .filter(table => selectedZoneFilter === 'all' || (table.zone || 'N/A') === selectedZoneFilter)
                                         .sort((a, b) => {
                                             const nameA = parseInt(a.name);
                                             const nameB = parseInt(b.name);
                                             if (!isNaN(nameA) && !isNaN(nameB)) return nameA - nameB;
                                             if (!isNaN(nameA) && isNaN(nameB)) return -1;
                                             if (isNaN(nameA) && !isNaN(nameB)) return 1;
                                             return a.name.localeCompare(b.name);
                                         })
                                         .map((table) => (
                                             <Button
                                                 key={table.id}
                                                 variant="outline"
                                                 className={`h-20 sm:h-24 flex flex-col justify-center items-center rounded-lg shadow-sm transition-all p-2 border-2 ${!table.is_available ? "bg-destructive/10 border-destructive/30 text-destructive cursor-not-allowed opacity-70 hover:bg-destructive/15" : selectedTable === table.id ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary ring-offset-2" : "bg-green-100 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:border-green-700 dark:hover:bg-green-800/30"}`}
                                                 onClick={() => {
                                                      if (!table.is_available) {
                                                          toast.warn(`Stol ${table.name} hozirda band.`);
                                                          return;
                                                      }
                                                     setSelectedTable(table.id);
                                                     setShowTableDialog(false);
                                                     toast.success(`Stol ${table.name} tanlandi`);
                                                 }}
                                                 disabled={!table.is_available || createOrderMutation.isPending}
                                             >
                                                 <div className="text-center">
                                                     <div className="font-semibold text-base sm:text-lg">{table.name}</div>
                                                     <div className={`text-xs mt-1 font-medium ${!table.is_available ? 'text-destructive dark:text-destructive/80' : 'text-green-600 dark:text-green-400'}`}>
                                                         {table.is_available ? "Bo‘sh" : "Band"}
                                                     </div>
                                                     {table.zone && <div className="text-[10px] text-muted-foreground mt-0.5">({table.zone})</div>}
                                                 </div>
                                             </Button>
                                         ))}
                                 </div>
                             </ScrollArea>
                         )}
                     </div>
                      <DialogFooter className="px-6 pb-6">
                         <DialogClose asChild>
                             <Button variant="ghost">
                                 Bekor qilish
                             </Button>
                         </DialogClose>
                      </DialogFooter>
                 </DialogContent>
             </Dialog>

            {/* Mijoz ma'lumotlari dialogi */}
            <Dialog open={showCustomerDialog} onOpenChange={(open) => {
                // Dialog yopilganda telefonni prefiksga qaytarish (agar bo'sh bo'lsa)
                if (!open && customerInfo.phone.trim() === "+998") {
                    setCustomerInfo(prev => ({...prev, phone: "+998 "}));
                }
                setShowCustomerDialog(open)
            }}>
                 <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{orderType === "delivery" ? "Yetkazib berish ma‘lumotlari" : "Mijoz ma‘lumotlari"}</DialogTitle>
                        <DialogDescription>{orderType === "delivery" ? "Yetkazib berish uchun mijoz ma‘lumotlarini kiriting." : "Olib ketish uchun mijoz ma‘lumotlarini kiriting."}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                             <Label htmlFor="customer-name-dialog">Ism*</Label>
                             <Input id="customer-name-dialog" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} placeholder="Mijozning ismi" required/>
                        </div>
                        {/* ================== TELEFON RAQAM O'ZGARTIRILDI ================== */}
                        <div className="space-y-2">
                            <Label htmlFor="customer-phone-dialog">Telefon*</Label>
                            {/* Oddiy Input, lekin `onChange` maxsus funksiya bilan */}
                            <Input
                                id="customer-phone-dialog"
                                type="tel" // Telefon klaviaturasini chiqarishga yordam beradi
                                value={customerInfo.phone}
                                onChange={handlePhoneChange} // Maxsus funksiya
                                placeholder="+998 XX XXX XX XX"
                                required
                                disabled={createOrderMutation.isPending}
                                // Maksimal uzunlik (ixtiyoriy, +998 va 9 raqam + bo'shliqlar)
                                maxLength={17} // +998 12 345 67 89 uchun
                            />
                        </div>
                        {/* ================== TELEFON RAQAM O'ZGARTIRILDI ================== */}
                        {orderType === "delivery" && (
                             <div className="space-y-2">
                                <Label htmlFor="customer-address-dialog">Manzil*</Label>
                                <Input id="customer-address-dialog" value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} placeholder="Yetkazib berish manzili" required/>
                            </div>
                         )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Bekor qilish</Button></DialogClose>
                        <Button
                            onClick={handleCustomerInfoSave}
                            disabled={
                                !customerInfo.name ||
                                !customerInfo.phone ||
                                // Prefiksdan keyin raqam borligini tekshirish
                                customerInfo.phone.trim() === "+998" ||
                                (orderType === "delivery" && !customerInfo.address) ||
                                createOrderMutation.isPending
                            }
                        >
                            Saqlash
                        </Button>
                    </DialogFooter>
                 </DialogContent>
            </Dialog>

            {/* Chiqish dialog modali */}
            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                 <DialogContent className="sm:max-w-[400px]"> <DialogHeader> <DialogTitle>Chiqishni tasdiqlash</DialogTitle> <DialogDescription>Rostdan ham tizimdan chiqmoqchimisiz?</DialogDescription> </DialogHeader> <DialogFooter className="mt-4 flex justify-end gap-2"> <DialogClose asChild><Button variant="outline">Bekor qilish</Button></DialogClose> <Button variant="destructive" onClick={handleLogout}> Chiqish </Button> </DialogFooter> </DialogContent>
            </Dialog>

            {/* Buyurtmalar Tarixi dialogi */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                 <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl h-[90vh] flex flex-col">
                     <DialogHeader> <DialogTitle>Buyurtmalar Tarixi</DialogTitle> <DialogDescription>O'tgan buyurtmalarni ko'rish. Tahrirlash uchun ustiga bosing (tayyor yoki bekor qilinganlarni tahrirlab bo'lmaydi).</DialogDescription> </DialogHeader>
                     <div className="px-6 py-2">
                          <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input type="search" placeholder="ID, mijoz, tel, stol bo'yicha qidirish..." className="w-full rounded-lg bg-background pl-8" value={historySearchQuery} onChange={(e) => setHistorySearchQuery(e.target.value)} />
                          </div>
                      </div>
                     <div className="flex-1 overflow-hidden px-1">
                         <ScrollArea className="h-full px-5 pb-6">
                             {isHistoryLoading ? (
                                 <div className="flex h-full items-center justify-center text-muted-foreground"> <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Yuklanmoqda... </div>
                             ) : historyError ? (
                                 <div className="flex h-full items-center justify-center text-destructive">{historyError instanceof Error ? historyError.message : "Tarix yuklash xatosi"}</div>
                             ) : orderHistory.length === 0 ? (
                                 <div className="flex h-full items-center justify-center text-muted-foreground"> {historySearchQuery ? `"${historySearchQuery}" uchun buyurtma topilmadi.` : "Buyurtmalar tarixi hozircha bo'sh."} </div>
                             ) : (
                                 <div className="space-y-4">
                                     {[...orderHistory]
                                         .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                         .map((order) => (
                                         <Card
                                             key={order.id}
                                             className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${order.status === 'completed' || order.status === 'cancelled' ? 'opacity-70' : 'cursor-pointer'} ${isEditLoadingManual && editingOrderId === order.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                             onClick={() => {
                                                 if (order.status === 'completed' || order.status === 'cancelled') { toast.warn(`Bu buyurtma (${order.status_display}) holatida, tahrirlab bo'lmaydi.`); return; }
                                                 if (isEditLoadingManual || updateOrderItemsMutation.isPending || createOrderMutation.isPending || reorderMutation.isPending) { toast.info("Iltimos, avvalgi amal tugashini kuting."); return; }
                                                 if (editingOrderId === order.id) { console.log(`Buyurtma #${order.id} allaqachon tahrirlanmoqda.`); setShowHistoryDialog(false); return; }
                                                 loadOrderForEditing(order.id);
                                             }}
                                         >
                                             <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-6 md:grid-cols-8 gap-x-4 gap-y-2 text-sm">
                                                 {/* ... Order details ... */}
                                                 <div className="sm:col-span-2 md:col-span-2 space-y-1"> <div className="font-medium">ID: <span className="text-primary font-semibold">{order.id}</span></div> <div className="text-muted-foreground text-xs">{formatDateTime(order.created_at)}</div> </div>
                                                 <div className="sm:col-span-2 md:col-span-2 space-y-1 flex flex-col items-start"> <Badge variant="outline">{order.order_type_display || order.order_type}</Badge> <Badge variant={ order.status === 'completed' ? 'success' : order.status === 'pending' || order.status === 'ready' ? 'secondary' : order.status === 'paid' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'outline' } className="mt-1 capitalize"> {order.status_display || order.status} </Badge> </div>
                                                 <div className="sm:col-span-2 md:col-span-2 space-y-1"> {order.customer_name && <div className="truncate" title={order.customer_name}>Mijoz: <span className="font-medium">{order.customer_name}</span></div>} {order.table_name && <div>Stol: <span className="font-medium">{order.table_name}</span>{order.table_zone && <span className='text-xs text-muted-foreground'> ({order.table_zone})</span>}</div>} {order.customer_phone && <div className="text-xs text-muted-foreground">{order.customer_phone}</div>} </div>
                                                  <div className="sm:col-span-6 md:col-span-2 space-y-1 text-right sm:text-left md:text-right pt-2 sm:pt-0 md:pt-0 flex flex-col items-end justify-between">
                                                      <div> <div className="font-semibold text-base">{Number(order.final_price || 0).toLocaleString('uz-UZ')} so'm</div> <div className="text-muted-foreground text-xs">{order.item_count || 'Noma\'lum'} ta mahsulot</div> </div>
                                                     {order.status === 'completed' && (
                                                         <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={(e) => { e.stopPropagation(); reorderToSameTable(order); }} disabled={isEditLoadingManual || updateOrderItemsMutation.isPending || createOrderMutation.isPending || reorderMutation.isPending}>
                                                              {reorderMutation.isPending && reorderMutation.variables?.originalOrderId === order.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin"/> : <Repeat className="h-3 w-3 mr-1" />} Qayta Buyurtma
                                                         </Button>
                                                     )}
                                                 </div>
                                             </CardContent>
                                             {isEditLoadingManual && editingOrderId === order.id && (
                                                 <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg"> <Loader2 className="h-6 w-6 animate-spin text-primary" /> </div>
                                             )}
                                             {(order.status !== 'completed' && order.status !== 'cancelled') && ( <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"> <Edit className="h-4 w-4 text-muted-foreground"/> </div> )}
                                         </Card>
                                     ))}
                                 </div>
                             )}
                         </ScrollArea>
                     </div>
                     <DialogFooter className="px-6 py-3 border-t">
                         <DialogClose asChild>
                             <Button variant="outline">
                                 Yopish
                             </Button>
                         </DialogClose>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>

        </div>
    </TooltipProvider>
  )
}