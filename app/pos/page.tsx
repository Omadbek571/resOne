"use client"

import { useState, useEffect, useMemo } from "react"
// Ikonkalar (keraklilari qo'shildi)
import { Bell, LogOut, Search, ShoppingBag, ShoppingCart, Truck, Users, Minus, Plus as PlusIcon, History, Eye, Edit, Loader2, X, Save, RotateCcw, CheckCircle, Repeat } from "lucide-react"
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
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
// Tooltip komponentlarini to'g'ri import qilish
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function POSPage() {
  // === Asosiy State'lar ===
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [tables, setTables] = useState([])
  const [isLoading, setIsLoading] = useState(true) // Chap panel mahsulotlari
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingTables, setIsLoadingTables] = useState(true)
  const [error, setError] = useState("") // Chap panel xatosi
  const [errorCategories, setErrorCategories] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")

  // === O'ng Panel State'lari (Yangi/Tahrirlash Rejimi) ===
  const [editingOrderId, setEditingOrderId] = useState(null); // null = Yangi, ID = Tahrirlash
  const [orderToEdit, setOrderToEdit] = useState(null); // Tahrirlash uchun yuklangan buyurtma
  const [originalOrderItems, setOriginalOrderItems] = useState([]); // TAHRIRLASHNI BOSHLAGANDAGI ASL ITEMLAR (FARQNI ANIQLASH UCHUN)
  const [isEditLoading, setIsEditLoading] = useState(false); // Tahrirlash uchun yuklash jarayoni
  const [editError, setEditError] = useState(null); // Tahrirlash uchun yuklash xatosi
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false); // API'ga o'zgarish YAKUNIY yuborish jarayoni
  const [submitEditError, setSubmitEditError] = useState(null); // O'zgarish yuborishdagi xato
  const [cart, setCart] = useState([]); // Faqat YANGI buyurtma uchun savat

  // === Yangi Buyurtma Uchun Qo'shimcha State'lar ===
  const [orderType, setOrderType] = useState("dine_in")
  const [selectedTable, setSelectedTable] = useState(null)
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" })
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  // --- YANGI: Stol Filter uchun State ---
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all'); // 'all' yoki zona nomi

  // === Dialog Oynalari State'lari ===
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

  // === Buyurtmalar Tarixi State'lari ===
  const [orderHistory, setOrderHistory] = useState([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState("")
  const [historySearchQuery, setHistorySearchQuery] = useState("")

  // Helper function to get token
  const getToken = () => {
    if (typeof window !== "undefined") { return localStorage.getItem("token") }
    return null
  }

  // Kategoriyalarni yuklash
  useEffect(() => {
    const token = getToken(); if (!token) { setErrorCategories("Token yo'q"); setIsLoadingCategories(false); return; }
    setIsLoadingCategories(true);
    axios.get("https://oshxonacopy.pythonanywhere.com/api/categories/", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setCategories(res.data || []); setIsLoadingCategories(false); })
      .catch(err => { console.error("Kategoriya xato:", err); setErrorCategories("Kategoriyalarni yuklashda xato"); toast.error("Kategoriyalarni yuklashda xato"); setIsLoadingCategories(false); });
  }, []);

  // Mahsulotlarni yuklash
  useEffect(() => {
    const token = getToken(); if (!token) { setError("Token yo'q"); setIsLoading(false); return; }
    setIsLoading(true);
    axios.get("https://oshxonacopy.pythonanywhere.com/api/products/", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setProducts(res.data || []); setIsLoading(false); })
      .catch(err => { console.error("Mahsulot xato:", err); setError("Mahsulotlarni yuklashda xato"); toast.error("Mahsulotlarni yuklashda xato"); setIsLoading(false); });
  }, []);

  // Stollarni yuklash
  const fetchTables = () => {
    const token = getToken(); if (!token) { toast.error("Token topilmadi!"); setIsLoadingTables(false); return; }
    setIsLoadingTables(true);
    axios.get("https://oshxonacopy.pythonanywhere.com/api/tables/", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setTables(res.data || []); setIsLoadingTables(false); })
      .catch(err => { console.error("Stol xato:", err); toast.error("Stollarni yuklashda xato"); setIsLoadingTables(false); });
  };
  useEffect(() => { fetchTables(); }, []);

  // Buyurtmalar tarixini yuklash
  const fetchOrderHistory = (searchTerm = "") => {
    const token = getToken(); if (!token) { toast.error("Avtorizatsiyadan o'ting."); setHistoryError("Token yo'q"); return; }
    setIsHistoryLoading(true); setHistoryError("");
    let url = `https://oshxonacopy.pythonanywhere.com/api/orders/${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`;
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setOrderHistory(res.data || []); setIsHistoryLoading(false); })
      .catch(err => {
        console.error("Tarix xato:", err);
        let errorMsg = "Tarixni yuklashda xato";
        if (err.response?.status === 401) errorMsg = "Avtorizatsiya xatosi.";
        else if (err.response?.data) errorMsg = `Server xatosi: ${JSON.stringify(err.response.data)}`;
        setHistoryError(errorMsg); toast.error(errorMsg); setIsHistoryLoading(false);
      });
  };
  // Tarix qidiruvi o'zgarganda qayta yuklash
  useEffect(() => {
    if (showHistoryDialog) {
        const handler = setTimeout(() => fetchOrderHistory(historySearchQuery), 300);
        return () => clearTimeout(handler);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistoryDialog, historySearchQuery]);

  // === Buyurtmani O'NG PANELDA tahrirlash uchun yuklash funksiyasi ===
  const loadOrderForEditing = (orderId) => {
    const token = getToken();
    if (!token || !orderId) {
        toast.error("Tahrirlash uchun ID/token yetarli emas.");
        return;
    }
    if (isSubmittingEdit) {
        toast.warn("Iltimos, avvalgi amal tugashini kuting.");
        return;
    }
    if (isEditLoading && editingOrderId === orderId) {
        return;
    }

    console.log("Tahrirlash uchun yuklanmoqda:", orderId);
    setIsEditLoading(true); setEditError(null); setOrderToEdit(null); setCart([]); setEditingOrderId(null); setOriginalOrderItems([]);

    const url = `https://oshxonacopy.pythonanywhere.com/api/orders/${orderId}/`;
    axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
            if (res.data.status === 'completed' || res.data.status === 'cancelled') {
                toast.warn(`Buyurtma #${orderId} (${res.data.status_display}) holatida bo'lgani uchun tahrirlab bo'lmaydi.`);
                setIsEditLoading(false);
                setShowHistoryDialog(true);
                return;
            }

            setOrderToEdit(res.data);
            setOriginalOrderItems(JSON.parse(JSON.stringify(res.data.items || [])));
            setEditingOrderId(orderId);
            setIsEditLoading(false);
            toast.success(`Buyurtma #${orderId} tahrirlash uchun yuklandi.`);

            setShowHistoryDialog(false);
        })
        .catch((err) => {
            console.error(`Buyurtma (${orderId}) tahrirlashga yuklash xato:`, err);
            let errorMsg = `Buyurtma (${orderId}) tahrirlashga yuklashda xato`;
            if (err.response?.status === 401) errorMsg = "Avtorizatsiya xatosi.";
            else if (err.response?.status === 404) errorMsg = `Buyurtma (${orderId}) topilmadi.`;
            else if (err.response?.data) errorMsg = `Server xatosi: ${JSON.stringify(err.response.data)}`;
            setEditError(errorMsg);
            toast.error(errorMsg);
            setIsEditLoading(false);
            setEditingOrderId(null);
            setOriginalOrderItems([]);
            setShowHistoryDialog(true);
        });
  };

  // === Mahsulot miqdorini Faqatgina LOKAL STATEda YANGILASH/QO'SHISH/O'CHIRISH (Tahrirlash rejimi uchun) ===
  const handleLocalEditQuantityChange = (productId, change) => {
      if (!editingOrderId || !orderToEdit || isSubmittingEdit) return;

      setOrderToEdit(prevOrder => {
          if (!prevOrder) return null;
          const updatedItems = [...prevOrder.items];
          const itemIndex = updatedItems.findIndex(item => item.product === productId);

          if (itemIndex > -1) {
              const currentItem = updatedItems[itemIndex];
              const newQuantity = currentItem.quantity + change;

              if (newQuantity <= 0) {
                  updatedItems.splice(itemIndex, 1);
                  console.log(`Lokal o'chirildi: Mahsulot ID ${productId}`);
              } else {
                  updatedItems[itemIndex] = {
                      ...currentItem,
                      quantity: newQuantity,
                  };
                   console.log(`Lokal yangilandi: Mahsulot ID ${productId}, Yangi miqdor ${newQuantity}`);
              }
          } else if (change > 0) {
               console.warn(`handleLocalEditQuantityChange: Mahsulot ID ${productId} topilmadi, lekin qo'shishga harakat qilindi.`);
               // Agar mahsulot ro'yxatda bo'lmasa va "+" bosilsa, uni qo'shish mantiqan to'g'ri bo'lishi mumkin
               // Ammo hozirgi logikada faqat mavjudini o'zgartiradi.
               // Agar kerak bo'lsa, findProductById(productId) qilib, yangi item qo'shish mumkin.
          }

          return { ...prevOrder, items: updatedItems };
      });
  };

  // Chap paneldagi mahsulot bosilganda LOKAL qo'shish/oshirish (Tahrirlash rejimi uchun)
  const handleLocalAddItemFromProductList = (product) => {
      if (!editingOrderId || !orderToEdit || !product || isSubmittingEdit) return;

      setOrderToEdit(prevOrder => {
          if (!prevOrder) return null;
          const updatedItems = [...prevOrder.items];
          const itemIndex = updatedItems.findIndex(item => item.product === product.id);

          if (itemIndex > -1) {
              const currentItem = updatedItems[itemIndex];
              updatedItems[itemIndex] = { ...currentItem, quantity: currentItem.quantity + 1 };
              console.log(`Lokal miqdor oshirildi (+): Mahsulot ID ${product.id}`);
          } else {
              updatedItems.push({
                  // Backenddan kelgan item `id` (order_item_id) bo'lmaydi, shuning uchun vaqtinchalik unique key
                  // Aslida bu yangi item bo'lgani uchun order_item_id bo'lmaydi
                  id: `temp-${Date.now()}-${product.id}`, // Vaqtinchalik front uchun key
                  product: product.id,
                  product_details: { // Backendga mos product_details
                      id: product.id,
                      name: product.name,
                      image_url: product.image, // image_url deb nomlangan API javobiga mos
                      // Agar boshqa detallar kerak bo'lsa, product obyektidan qo'shiladi
                  },
                  quantity: 1,
                  unit_price: product.price, // Narxni saqlash
                  total_price: product.price // Umumiy narxni saqlash
              });
               console.log(`Lokal yangi qo'shildi: Mahsulot ID ${product.id}`);
          }
          return { ...prevOrder, items: updatedItems };
      });
  };


  // === Tahrirlangan O'zgarishlarni YAKUNIY APIga Yuborish Funksiyasi ===
  const submitEditedOrderChanges = async () => {
    if (!editingOrderId || !orderToEdit || !originalOrderItems || isSubmittingEdit || isEditLoading) {
      toast.warn("Hozirda o'zgarishlarni saqlash mumkin emas. Yuklanmoqda yoki boshqa jarayon ketmoqda.");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!");
      return;
    }

    const currentItems = orderToEdit.items || [];
    const operations = [];

    // 1. Yangi qo'shilganlarni aniqlash ("add")
    currentItems.forEach((currentItem) => {
      const originalItem = originalOrderItems.find((o) => o.product === currentItem.product);
      if (!originalItem) {
        // Yangi qo'shilganlar uchun "id" bo'lmaydi, faqat product_id va quantity kerak
        operations.push({
          operation: "add",
          product_id: currentItem.product, // Mahsulot IDsi
          quantity: currentItem.quantity,
        });
        console.log(`Operatsiya (Add): Mahsulot ID ${currentItem.product}, Miqdor ${currentItem.quantity}`);
      }
    });

    // 2. O'zgarganlarni aniqlash ("set") va o'chirilganlarni aniqlash ("remove")
    originalOrderItems.forEach((originalItem) => {
      const currentItem = currentItems.find((c) => c.product === originalItem.product);
      if (currentItem) {
        // Agar item hali ham mavjud bo'lsa
        if (currentItem.quantity !== originalItem.quantity) {
          // Agar miqdori o'zgargan bo'lsa -> "set"
          // Faqat API'dan kelgan va `id` (order_item_id) mavjud bo'lganlar uchungina "set"
          if (originalItem.id && typeof originalItem.id === 'number') {
              operations.push({
                operation: "set",
                order_item_id: originalItem.id, // Mavjud itemning IDsi
                quantity: currentItem.quantity,
              });
              console.log(`Operatsiya (Set): OrderItemID ${originalItem.id}, Yangi miqdor ${currentItem.quantity}`);
          } else {
               console.warn(`Operatsiya (Set) uchun OrderItemID topilmadi yoki noto'g'ri: ID=${originalItem.id}, product_id: ${originalItem.product}. Bu element yangi qo'shilgan va o'zgartirilgan bo'lishi mumkin.`);
               // Bunday holatda, yuqoridagi "add" operatsiyasi bu yangi elementni qo'shadi.
               // Agar yangi qo'shilgan elementning miqdori keyin o'zgartirilsa,
               // "add" operatsiyasini to'g'ri miqdor bilan yuborish kerak.
               // Hozirgi logikada: Yangi qo'shilgan -> o'zgartirilgan -> "add" to'g'ri miqdor bilan boradi.
          }
        }
        // Agar miqdor o'zgarmagan bo'lsa, hech narsa qilmaymiz
      } else {
         // Agar original item hozirgilarida yo'q bo'lsa -> "remove"
         // Faqat API'dan kelgan va `id` (order_item_id) mavjud bo'lganlar uchungina "remove"
         if (originalItem.id && typeof originalItem.id === 'number') {
              operations.push({
                operation: "remove",
                order_item_id: originalItem.id, // O'chiriladigan itemning IDsi
              });
              console.log(`Operatsiya (Remove): OrderItemID ${originalItem.id}`);
         } else {
              console.warn(`Operatsiya (Remove) uchun OrderItemID topilmadi yoki noto'g'ri: ID=${originalItem.id}, product_id: ${originalItem.product}. Bu element yangi qo'shilib, keyin o'chirilgan bo'lishi mumkin.`);
              // Agar yangi qo'shilib keyin o'chirilgan bo'lsa, hech qanday operatsiya kerak emas.
         }
      }
    });

    if (operations.length === 0) {
      toast.info("Hech qanday o'zgarish qilinmadi.");
      finishEditingInternal();
      return;
    }

    setIsSubmittingEdit(true);
    setSubmitEditError(null);

    const payload = {
      items_operations: operations,
    };

    const url = `https://oshxonacopy.pythonanywhere.com/api/orders/${editingOrderId}/update-items/`;
    console.log("API so'rovi yuborilmoqda:", JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("API javobi:", response.data);
      toast.success(`Buyurtma #${editingOrderId} muvaffaqiyatli yangilandi!`);

      finishEditingInternal(); // Muvaffaqiyatli bo'lsa, tahrirlashni yakunlash

      // Tarixni yangilash (agar ochiq bo'lsa)
      if (showHistoryDialog) {
        fetchOrderHistory(historySearchQuery);
      }

    } catch (err) {
      console.error("API xatosi:", err.response || err);
      let errorMsg = "O'zgarishlarni saqlashda xato yuz berdi.";

      if (err.response) {
        const { status, data } = err.response;
        if (status === 400) { // Bad Request (Validatsiya xatosi)
          if (data?.detail) { // Umumiy xatolik
            errorMsg = data.detail;
          } else if (data?.items_operations && Array.isArray(data.items_operations)) { // Har bir operatsiya uchun xatolik
             const opErrors = data.items_operations
              .map((opError, index) => {
                  if (opError && typeof opError === 'object' && Object.keys(opError).length > 0) {
                      // Operatsiyani topish (payload.items_operations[index])
                      const failedOp = payload.items_operations[index] || {};
                      const errorDetails = Object.entries(opError)
                            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
                            .join('; ');
                      return `Operatsiya ${index + 1} (${failedOp.operation || 'noma\'lum'}): ${errorDetails}`;
                  }
                  return null; // Xato yo'q
              })
              .filter(Boolean); // Null qiymatlarni olib tashlash

             if (opErrors.length > 0) {
                 errorMsg = `Operatsiya xatoliklari: ${opErrors.join('. ')}`;
             } else {
                  errorMsg = "Validatsiya xatosi (noma'lum).";
             }
          } else if (typeof data === 'object') {
            errorMsg = Object.entries(data)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
              .join('; ');
          } else {
            errorMsg = `Validatsiya xatosi: ${JSON.stringify(data)}`;
          }
        } else if (status === 401) { // Unauthorized
          errorMsg = "Avtorizatsiya xatosi.";
        } else if (status === 403) { // Forbidden
          errorMsg = "Ruxsat yo'q.";
        } else if (status === 404) { // Not Found
          errorMsg = "Buyurtma yoki so'ralgan element topilmadi.";
        } else { // Boshqa server xatoliklari
          errorMsg = `Server xatosi (${status}): ${JSON.stringify(data)}`;
        }
      } else { // Tarmoq xatosi yoki boshqa
        errorMsg = `Ulanish xatosi: ${err.message}`;
      }

      setSubmitEditError(errorMsg);
      toast.error(errorMsg, { autoClose: 7000 }); // Xatoni uzoqroq ko'rsatish
    } finally {
      setIsSubmittingEdit(false); // Jarayon tugadi (xato yoki muvaffaqiyat)
    }
  };


  // === YANGI: Tayyor Buyurtmani O'sha Stolga Qayta Jo'natish Funksiyasi ===
  const reorderToSameTable = (order) => {
    const token = getToken();
    if (!token) {
      toast.error("Avtorizatsiya tokeni topilmadi!");
      return;
    }

    // Qayta buyurtma berishdan oldin tahrirlash rejimini tekshirish
    if (editingOrderId || isEditLoading || isSubmittingEdit) {
        toast.warn("Iltimos, avval tahrirlash rejimini yakunlang yoki bekor qiling.");
        return;
    }

    if (order.status !== "completed") {
      toast.warn("Bu funksiya faqat tayyor (completed) buyurtmalar uchun ishlaydi.");
      return;
    }

    if (!order.table_id && order.order_type === "dine_in") {
      toast.error("Stol ma'lumotlari topilmadi. Qayta buyurtma berish mumkin emas.");
      return;
    }

    // Yangi buyurtma uchun ma'lumotlarni tayyorlash
    const orderData = {
      order_type: order.order_type,
      // Stol ID sini faqat 'dine_in' uchun yuboramiz
      table_id: order.order_type === "dine_in" ? order.table_id : null,
      // Mijoz ma'lumotlarini faqat 'takeaway' yoki 'delivery' uchun yuboramiz
      customer_name: (order.order_type === "takeaway" || order.order_type === "delivery") ? order.customer_name : null,
      customer_phone: (order.order_type === "takeaway" || order.order_type === "delivery") ? order.customer_phone : null,
      customer_address: order.order_type === "delivery" ? order.customer_address : null, // Faqat 'delivery' uchun
      items: order.items.map((item) => ({
        product_id: item.product, // Faqat product_id kerak
        quantity: item.quantity,
      })),
    };

    console.log("Qayta buyurtma ma'lumotlari:", orderData);

    // API'ga yangi buyurtma so'rovini yuborish
    toast.promise(
      axios.post("https://oshxonacopy.pythonanywhere.com/api/orders/", orderData, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      {
        pending: "Qayta buyurtma yuborilmoqda...",
        success: `Buyurtma #${order.id} dan nusxa muvaffaqiyatli yaratildi!`,
        error: {
          render({ data }) {
            console.error("Qayta buyurtma xato:", data);
            let msg = "Noma'lum xato!";
            if (data?.response?.data) {
              try {
                const errorData = data.response.data;
                if (typeof errorData === "string") msg = errorData;
                else if (errorData.detail) msg = errorData.detail;
                 // Agar stol band bo'lsa, maxsus xabar
                 else if (errorData.table_id && Array.isArray(errorData.table_id) && errorData.table_id[0]?.includes('is already occupied')) msg = `Stol ${order.table_name || order.table_id} hozirda band.`;
                else if (typeof errorData === "object")
                  msg = Object.entries(errorData)
                    .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join(",") : v}`)
                    .join(";");
              } catch (e) {
                console.error(e);
              }
            } else if (data?.response?.status) msg = `Server xatosi (${data.response.status})`;
            else if (data?.message) msg = data.message;
            return `Xatolik: ${msg}`;
          },
        },
      }
    )
      .then((res) => {
        // Yangi buyurtma yaratilgandan so'ng state'larni TOZALASH kerak,
        // eski buyurtma ma'lumotlari bilan to'ldirish EMAS.
        // Asosiy panel YANGI buyurtma holatiga o'tishi kerak.
        setCart([]); // Savatni tozalash
        setOrderType('dine_in'); // Standart holatga qaytarish (yoki oxirgi turiga qarab)
        setSelectedTable(null); // Stol tanlovini tozalash
        setCustomerInfo({ name: "", phone: "", address: "" }); // Mijoz ma'lumotini tozalash

        // Tahrirlash rejimini (agar aktiv bo'lsa ham) o'chirish
        setEditingOrderId(null);
        setOrderToEdit(null);
        setOriginalOrderItems([]);
        setIsEditLoading(false);
        setEditError(null);
        setSubmitEditError(null);

        // Tarix dialogini yopish va stollarni yangilash
        setShowHistoryDialog(false);
        fetchTables(); // Stollar holati o'zgargan bo'lishi mumkin
        // Tarixni qayta yuklash kerak emas, chunki yangi buyurtma qo'shildi
        // Agar kerak bo'lsa, fetchOrderHistory() ni chaqirish mumkin
      })
      .catch((err) => {
        // Xatolik toast.promise tomonidan ko'rsatiladi
        console.error("Qayta buyurtma catch xato:", err.response || err);
        // Agar xato stol bandligi bo'lsa, stollarni yangilash foydali bo'lishi mumkin
        if (err.response?.data?.table_id) {
            fetchTables();
        }
      });
  };


  // Bu funksiya endi loadOrderForEditing bilan bir xil, olib tashlash mumkin
  // const fetchOrderDetailsForEditing = (orderId) => {
  //      const token = getToken(); if (!token || !orderId) return;
  //      loadOrderForEditing(orderId);
  // }

  // === Yangi Buyurtma Yaratish Funksiyalari ===
  const addToCart = (product) => {
     if (editingOrderId) return; // Tahrirlash rejimida savatga qo'shmaslik
     if (!product?.id) { toast.error("Mahsulot qo'shishda xatolik."); return; }
    setCart((prev) => {
        const exist = prev.find((i) => i.id === product.id);
        if (exist) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        else return [...prev, { id: product.id, product: product, quantity: 1 }]; // Mahsulot ma'lumotini saqlash
    });
    // toast.success(`${product.name} savatga qo'shildi!`); // <--- O'CHIRILDI (SIZNING TALABINGIZGA BINOAN)
  }

  const decreaseQuantity = (item) => {
     if (editingOrderId) return; // Tahrirlash rejimida o'zgartirmaslik
     if (!item?.id) return;

     let itemWasRemoved = false; // Element o'chirilganligini belgilash uchun flag

     setCart((prev) => {
         const current = prev.find((i) => i.id === item.id);
         if (!current) {
             return prev; // Agar element topilmasa, oldingi state'ni qaytarish
         }

         if (current.quantity === 1) {
             itemWasRemoved = true; // Flag'ni o'rnatish
             // Toastni bu yerda chaqirmaymiz
             return prev.filter((i) => i.id !== item.id); // Faqat yangi state'ni hisoblash
         } else {
             // Toastni bu yerda chaqirmaymiz
             return prev.map((i) => i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i); // Faqat yangi state'ni hisoblash
         }
     });

     // State yangilanishi rejalashtirilgandan *keyin* toast'ni chaqirish
     // if (itemWasRemoved) {
         // `item` argumentida kelgan product nomini ishlatish
         // toast.info(`${item.product?.name || 'Mahsulot'} savatdan o‘chirildi`); // <--- O'CHIRILDI (SIZNING TALABINGIZGA BINOAN)
     // }
  }

  const increaseQuantity = (item) => {
     if (editingOrderId) return; // Tahrirlash rejimida o'zgartirmaslik
     if (!item?.id) return;
    setCart((prev) => prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
  }

  const submitOrder = () => {
     if (editingOrderId) return; // Tahrirlash rejimida buyurtma bermaslik
    const token = getToken(); if (!token) { toast.error("Avtorizatsiya tokeni topilmadi!"); return; }
    if (cart.length === 0) { toast.warn("Savat bo‘sh!"); return; }
    if (orderType === "dine_in" && !selectedTable) { toast.warn("Stol tanlang!"); setShowTableDialog(true); return; }
    if ((orderType === "takeaway" || orderType === "delivery") && (!customerInfo.name || !customerInfo.phone)) { setShowCustomerDialog(true); toast.warn("Mijoz nomi va raqamini kiriting!"); return; }
    if (orderType === "delivery" && !customerInfo.address) { setShowCustomerDialog(true); toast.warn("Yetkazish manzilini kiriting!"); return; }

    const orderData = {
      order_type: orderType,
      table_id: orderType === "dine_in" ? selectedTable : null,
      customer_name: (orderType === "takeaway" || orderType === "delivery") ? customerInfo.name : null,
      customer_phone: (orderType === "takeaway" || orderType === "delivery") ? customerInfo.phone : null,
      customer_address: orderType === "delivery" ? customerInfo.address : null,
      items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    }
    console.log("Yangi buyurtma:", orderData);
    toast.promise(
      axios.post("https://oshxonacopy.pythonanywhere.com/api/orders/", orderData, { headers: { Authorization: `Bearer ${token}` } }),
       {
         pending: 'Buyurtma yuborilmoqda...',
         success: 'Buyurtma muvaffaqiyatli yaratildi!',
         error: { render({data}){ console.error("Yangi buyurtma xato:", data); let msg = "Noma'lum xato!"; if(data?.response?.data){ try{ const errorData = data.response.data; if(typeof errorData === 'string') msg=errorData; else if(errorData.detail) msg=errorData.detail; else if(errorData.table_id && Array.isArray(errorData.table_id) && errorData.table_id[0]?.includes('is already occupied')) msg=`Stol ${tables.find(t=>t.id===selectedTable)?.name || selectedTable} hozirda band.`; else if(typeof errorData === 'object') msg=Object.entries(errorData).map(([k,v])=>`${k}:${Array.isArray(v)?v.join(','):v}`).join(';');}catch(e){console.error(e)}} else if(data?.response?.status) msg=`Server xatosi (${data.response.status})`; else if(data?.message) msg=data.message; return `Xatolik: ${msg}`; } }
       }
    ).then(() => {
        setCart([]); setCustomerInfo({ name: "", phone: "", address: "" }); setSelectedTable(null);
        setShowCustomerDialog(false); setShowTableDialog(false); fetchTables(); // Stollarni yangilash
        // Yangi buyurtma yaratilganda tarixni yangilash shart emas, lekin agar kerak bo'lsa:
        // if (showHistoryDialog) fetchOrderHistory(historySearchQuery);
      })
      .catch((err) => {
          console.error("Yangi buyurtma catch xato:", err.response || err);
          // Agar xato stol bandligi bo'lsa, stollarni qayta yuklash
          if (err.response?.data?.table_id) {
              fetchTables();
          }
      });
  }
  const handleCustomerInfoSave = () => {
     if (!customerInfo.name || !customerInfo.phone) { toast.warn("Ism va raqamni kiriting!"); return; }
     if (orderType === "delivery" && !customerInfo.address) { toast.warn("Manzilni kiriting!"); return; }
    setShowCustomerDialog(false); toast.info("Mijoz ma'lumotlari kiritildi.");
  }

  // === Tahrirlash Rejimini Yakunlash (Ichki funksiya - state tozalash) ===
  const finishEditingInternal = () => {
      const previousId = editingOrderId;
      setEditingOrderId(null);
      setOrderToEdit(null);
      setOriginalOrderItems([]);
      setIsEditLoading(false);
      setEditError(null);
      setIsSubmittingEdit(false); // Buni ham tozalash kerak
      setSubmitEditError(null);
      setCart([]); // Yangi buyurtma savatini ham tozalash
      // Agar tarix oynasi ochiq bo'lsa va ID mavjud bo'lsa, tarixni yangilash
      // Bu operatsiya yakunlanganda kerak bo'lishi mumkin
      if (showHistoryDialog && previousId) {
         setTimeout(() => fetchOrderHistory(historySearchQuery), 100); // Kichik kechikish bilan yangilash
      }
  }

   // === Tahrirlashni Bekor Qilish Tugmasi uchun Funksiya ===
   const cancelEditing = () => {
     if (isSubmittingEdit) {
         toast.warn("Yakuniy saqlash jarayoni ketmoqda, bekor qilib bo'lmaydi.");
         return;
     }
     const previousId = editingOrderId;
     if (previousId) { // Faqat ID mavjud bo'lsa xabar chiqarish
       toast.info(`Buyurtma #${previousId} tahrirlash bekor qilindi.`);
     }
     finishEditingInternal(); // State'larni tozalash
 }

  // === Boshqa Funksiyalar ===
  const handleLogout = () => { if (typeof window !== "undefined") { localStorage.removeItem("token"); window.location.href = "/auth"; toast.info("Tizimdan chiqildi");} }
  const formatDateTime = (d) => { if (!d) return "N/A"; try { return new Date(d).toLocaleString('uz-UZ', { year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false }); } catch (e) { return d; } };

  // === Memoized Qiymatlar ===
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter((p) => {
      if (!p.is_active) return false; // Aktiv bo'lmaganlarni o'tkazib yuborish
      const nameMatch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const catMatch = selectedCategory === null || p.category?.id === selectedCategory;
      return nameMatch && catMatch;
    });
  }, [products, selectedCategory, searchQuery]);

  // O'ng panel uchun joriy elementlarni aniqlash
  const currentPanelItems = useMemo(() => {
      if (editingOrderId && orderToEdit?.items) {
          // Tahrirlash rejimida: orderToEdit.items
          return orderToEdit.items;
      } else if (!editingOrderId) {
          // Yangi buyurtma rejimida: cart
          return cart;
      } else {
          // Boshqa holatlar (masalan, tahrirlash boshlanishidan oldin): bo'sh massiv
          return [];
      }
  }, [editingOrderId, orderToEdit, cart]); // Bu dependencylar to'g'ri

  // O'ng panel uchun joriy umumiy summani hisoblash
  const currentPanelTotal = useMemo(() => {
      if (editingOrderId && orderToEdit?.items) {
           // Tahrirlashda API'dan kelgan narxni ishlatish (yoki lokal hisoblash)
           // Lokal hisoblash ishonchliroq bo'lishi mumkin, chunki miqdor o'zgaradi
           return orderToEdit.items.reduce((sum, item) => {
               const price = Number(item.unit_price) || 0; // Har ehtimolga qarshi Number()
               return sum + (price * item.quantity);
           }, 0);
      } else if (!editingOrderId) {
          // Yangi buyurtmada lokal hisoblash
          return cart.reduce((total, item) => {
               const price = parseFloat(item.product?.price) || 0; // Mahsulot narxini olish
               return total + (price * item.quantity);
           }, 0);
      } else {
          return 0;
      }
  }, [editingOrderId, orderToEdit, cart]); // Bu dependencylar to'g'ri

  // --- YANGI: Unikal Zonalar ro'yxatini olish ---
  const uniqueZones = useMemo(() => {
    if (!Array.isArray(tables)) return [];
    const zones = tables.map(t => t.zone || 'N/A'); // Agar zone null bo'lsa 'N/A' deb olamiz
    // Unikal zonalar ro'yxatini yaratish va 'all' ni boshiga qo'shish
    const uniqueSet = new Set(zones);
    // Saralash: avval raqamli, keyin harfli, N/A oxirida
    const sortedZones = Array.from(uniqueSet).sort((a, b) => {
        if (a === 'N/A') return 1;
        if (b === 'N/A') return -1;
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB; // Raqamlarni solishtirish
        if (!isNaN(numA) && isNaN(numB)) return -1; // Raqam harfdan oldin
        if (isNaN(numA) && !isNaN(numB)) return 1; // Harf raqamdan keyin
        return a.localeCompare(b); // Harflarni solishtirish
    });
    return ['all', ...sortedZones];
  }, [tables]);


  // === UI QISMI (RETURN) ===
  return (
    <TooltipProvider>
        <div className="flex h-screen flex-col bg-muted/40">
            {/* === TOAST CONTAINER JOYI O'ZGARTIRILDI === */}
            <ToastContainer
                position="bottom-right" // <--- O'ZGARTIRILDI
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
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowLogoutDialog(true)}>
                                <LogOut className="h-5 w-5" />
                                <span className="sr-only">Chiqish</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Tizimdan Chiqish</p>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0" onClick={() => { setHistorySearchQuery(''); fetchOrderHistory(); setShowHistoryDialog(true); }}>
                                <History className="h-5 w-5" />
                                <span className="sr-only">Buyurtmalar Tarixi</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Buyurtmalar Tarixi</p>
                        </TooltipContent>
                    </Tooltip>

                    <h1 className="text-lg sm:text-xl font-bold hidden md:inline-block">SmartResto POS</h1>
                </div>

                <div className="flex-1 flex justify-center px-4">
                    <Tabs
                        value={editingOrderId ? '' : orderType} // Tahrirlashda qiymatni o'chirish
                        onValueChange={editingOrderId ? () => {} : setOrderType} // Tahrirlashda o'zgartirishni bloklash
                        className={`w-full max-w-md ${editingOrderId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <TabsList className="grid w-full grid-cols-3 h-11">
                            <TabsTrigger value="dine_in" disabled={!!editingOrderId} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">Shu yerda</span>
                                <span className="sm:hidden">Ichkarida</span>
                            </TabsTrigger>
                            <TabsTrigger value="takeaway" disabled={!!editingOrderId} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                <ShoppingBag className="h-4 w-4" />
                                <span className="hidden sm:inline">Olib ketish</span>
                                <span className="sm:hidden">Olib k.</span>
                            </TabsTrigger>
                            <TabsTrigger value="delivery" disabled={!!editingOrderId} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                                <Truck className="h-4 w-4" />
                                <span className="hidden sm:inline">Yetkazish</span>
                                <span className="sm:hidden">Yetkaz.</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Bildirishnomalar uchun joy (agar kerak bo'lsa) */}
                </div>
            </header>

            {/* Asosiy Kontent */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-0 overflow-hidden">

                {/* Chap taraf - Mahsulotlar */}
                <div className="md:col-span-2 lg:col-span-3 flex flex-col border-r border-border overflow-hidden">
                    <div className="border-b border-border p-4 shrink-0">
                        <div className="relative mb-4">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Mahsulotlarni qidirish..."
                                className="w-full rounded-lg bg-background pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <ScrollArea className="w-full">
                            <div className="flex space-x-2 pb-2">
                                <Button
                                    size="sm"
                                    variant={selectedCategory === null ? "default" : "outline"}
                                    className="rounded-full whitespace-nowrap px-4"
                                    onClick={() => setSelectedCategory(null)}
                                >
                                    Barchasi
                                </Button>
                                {isLoadingCategories ? (
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground p-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Yuklanmoqda...</span>
                                    </div>
                                ) : errorCategories ? (
                                    <p className="text-sm text-destructive p-2">{errorCategories}</p>
                                ) : (
                                    Array.isArray(categories) && categories.map((category) => (
                                        <Button
                                            size="sm"
                                            key={category.id}
                                            variant={selectedCategory === category.id ? "default" : "outline"}
                                            className="rounded-full whitespace-nowrap px-4"
                                            onClick={() => setSelectedCategory(category.id)}
                                        >
                                            {category.name}
                                        </Button>
                                    ))
                                )}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-muted-foreground ml-2">Mahsulotlar yuklanmoqda...</p>
                            </div>
                        ) : error ? (
                            <div className="flex h-full flex-col items-center justify-center text-center p-4">
                                <p className="text-destructive mb-4">{error}</p>
                                <Button onClick={() => { setIsLoading(true); setError(''); /* fetchProducts() ni qayta chaqirish kerak */ }}>Qayta yuklash</Button>
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
                                            className={`cursor-pointer overflow-hidden transition-all hover:shadow-lg active:scale-95 flex flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm group ${isSubmittingEdit || isEditLoading ? 'opacity-70 pointer-events-none' : ''}`} // Edit paytida ham bloklash
                                            onClick={() => {
                                                if (isSubmittingEdit || isEditLoading) return; // Saqlash yoki yuklash jarayonida bosishni bloklash

                                                if (editingOrderId) {
                                                    handleLocalAddItemFromProductList(product);
                                                } else {
                                                    addToCart(product);
                                                }
                                            }}
                                        >
                                            <CardContent className="p-0 flex-1 flex flex-col">
                                                <div className="aspect-square w-full overflow-hidden relative">
                                                    <img
                                                        src={product.image || "/placeholder-product.jpg"}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                                        onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                                                        loading="lazy"
                                                    />
                                                </div>
                                                <div className="p-3 flex-grow flex flex-col justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-sm sm:text-base line-clamp-2" title={product.name}>{product.name}</h3>
                                                    </div>
                                                    <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
                                                        {Number(product.price).toLocaleString('uz-UZ')} so‘m
                                                    </p>
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
                    <div className="flex items-center justify-between border-b border-border p-4 shrink-0 h-16">
                        <div className="flex items-center space-x-2">
                            {isEditLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : editingOrderId ? <Edit className="h-5 w-5 text-primary" /> : <ShoppingCart className="h-5 w-5 text-muted-foreground" />}
                            <h2 className="text-lg font-medium">
                                {isEditLoading ? "Yuklanmoqda..." : editingOrderId ? `Tahrirlash #${editingOrderId}` : "Yangi Buyurtma"}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {editingOrderId && !isEditLoading && orderToEdit ? ( // Agar tahrirlash rejimi va yuklanib bo'lgan bo'lsa
                                <>
                                    {/* Stol va Mijoz Badge'lari (mavjud bo'lsa) */}
                                    {orderToEdit.table && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="outline" className="text-sm px-2 py-1">Stol {orderToEdit.table.name}</Badge>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Joy: {orderToEdit.table.zone || 'N/A'}</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                    {orderToEdit.customer_name && (
                                         <Tooltip>
                                             <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="text-xs px-2 py-1 max-w-[100px] truncate"><Users className="h-3 w-3 mr-1"/>{orderToEdit.customer_name}</Badge>
                                             </TooltipTrigger>
                                             <TooltipContent><p>{orderToEdit.customer_name}</p><p>{orderToEdit.customer_phone}</p>{orderToEdit.customer_address && <p>{orderToEdit.customer_address}</p>}</TooltipContent>
                                         </Tooltip>
                                    )}
                                    {/* Tahrirlashni Bekor Qilish Tugmasi */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={cancelEditing} disabled={isSubmittingEdit || isEditLoading}>
                                                <X className="h-5 w-5 text-destructive" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Tahrirlashni Bekor Qilish</p></TooltipContent>
                                    </Tooltip>
                                </>
                            ) : !editingOrderId ? ( // Agar yangi buyurtma rejimi bo'lsa
                                <>
                                    {/* Stol Tanlash / O'zgartirish Tugmasi */}
                                    {orderType === "dine_in" && (
                                        <>
                                            {selectedTable && (
                                                <Badge variant="outline" className="text-sm px-2 py-1 whitespace-nowrap">
                                                    Stol {tables.find((t) => t.id === selectedTable)?.name || selectedTable}
                                                </Badge>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowTableDialog(true)}
                                                className="whitespace-nowrap"
                                                disabled={isLoadingTables}
                                            >
                                                {selectedTable ? "O‘zgartirish" : "Stol tanlash"}
                                            </Button>
                                        </>
                                    )}
                                    {/* Mijoz Ma'lumotlari Badge/Tugmasi */}
                                    {(orderType === 'takeaway' || orderType === 'delivery') && customerInfo.name && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap truncate max-w-[100px] cursor-pointer" onClick={() => setShowCustomerDialog(true)}>
                                                    <Users className="h-3 w-3 mr-1" /> {customerInfo.name.split(' ')[0]}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{customerInfo.name}, {customerInfo.phone}</p>
                                                {orderType === 'delivery' && <p>{customerInfo.address}</p>}
                                                <p className="text-xs text-muted-foreground">(O'zgartirish uchun bosing)</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    {(orderType === 'takeaway' || orderType === 'delivery') && !customerInfo.name && (
                                        <Button variant="outline" size="sm" onClick={() => setShowCustomerDialog(true)}>
                                            Mijoz kiritish
                                        </Button>
                                    )}
                                </>
                            ) : null /* Tahrirlash yuklanayotganda hech narsa ko'rsatilmaydi */}
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                         {isEditLoading ? ( // Buyurtma yuklanayotgan bo'lsa
                             <div className="flex h-full items-center justify-center text-muted-foreground">
                                 <Loader2 className="h-8 w-8 animate-spin mr-2" /> Buyurtma yuklanmoqda...
                             </div>
                         ) : editError ? ( // Yuklashda xatolik bo'lsa
                             <div className="flex h-full flex-col items-center justify-center text-destructive p-4 text-center">
                                <p className="mb-3">{editError}</p>
                                <Button variant="outline" size="sm" onClick={()=>loadOrderForEditing(editingOrderId)} disabled={isEditLoading || isSubmittingEdit}>
                                    <RotateCcw className="mr-2 h-4 w-4"/> Qayta Urinish
                                </Button>
                             </div>
                         ) : currentPanelItems.length === 0 ? ( // Agar savat/buyurtma bo'sh bo'lsa
                            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-4">
                                 <ShoppingCart className="mb-4 h-16 w-16 text-gray-400" />
                                 <h3 className="text-lg font-semibold">{editingOrderId ? "Buyurtmada mahsulot yo'q" : "Savat bo‘sh"}</h3>
                                 <p className="text-sm mt-1">{editingOrderId ? "Chapdan mahsulot tanlab qo'shing" : "Yangi buyurtma uchun mahsulot tanlang"}</p>
                             </div>
                        ) : ( // Aks holda mahsulotlarni ko'rsatish
                            <div className="space-y-3">
                                {currentPanelItems.map((item) => {
                                    // Mahsulot ma'lumotlarini aniqlash (tahrirlash yoki yangi buyurtma)
                                    const productInfo = editingOrderId ? item.product_details : item.product;
                                    const productName = productInfo?.name;
                                    const productImage = editingOrderId ? productInfo?.image_url : productInfo?.image; // Editda image_url, Yangida image
                                    const unitPrice = editingOrderId ? item.unit_price : productInfo?.price;
                                    const productId = editingOrderId ? item.product : item.id; // Editda product, Yangida id
                                    const itemKey = editingOrderId ? (item.id || `item-${item.product}`) : item.id; // Unikal key (tahrirlashda order_item_id yoki vaqtinchalik)

                                    return (
                                        <div key={itemKey} className={`flex items-center justify-between space-x-2 border-b border-border pb-3 last:border-b-0 ${isSubmittingEdit ? 'opacity-70' : ''}`}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <img
                                                    src={productImage || "/placeholder-product.jpg"}
                                                    alt={productName || 'Mahsulot'}
                                                    className="h-10 w-10 rounded-md object-cover shrink-0"
                                                    onError={(e) => { e.currentTarget.src = "/placeholder-product.jpg"; }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-sm truncate" title={productName}>{productName || `ID: ${productId}`}</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {Number(unitPrice || 0).toLocaleString('uz-UZ')} so‘m
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 shrink-0">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={() => editingOrderId ? handleLocalEditQuantityChange(productId, -1) : decreaseQuantity(item)}
                                                    disabled={isSubmittingEdit || isEditLoading}
                                                    aria-label="Kamaytirish"
                                                >
                                                    <Minus className="h-3.5 w-3.5" />
                                                </Button>
                                                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-full"
                                                    onClick={() => editingOrderId ? handleLocalEditQuantityChange(productId, 1) : increaseQuantity(item)}
                                                    disabled={isSubmittingEdit || isEditLoading}
                                                    aria-label="Oshirish"
                                                >
                                                     <PlusIcon className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="text-right shrink-0 w-24">
                                                <p className="font-semibold text-sm">
                                                    {(Number(unitPrice || 0) * item.quantity).toLocaleString('uz-UZ')} so‘m
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                         {/* API dan qaytgan xatolikni ko'rsatish */}
                         {submitEditError && (
                             <p className="text-center text-destructive text-xs mt-4 p-2 bg-destructive/10 rounded">{submitEditError}</p>
                         )}
                    </ScrollArea>

                    <div className="border-t border-border p-4 shrink-0 bg-muted/20">
                        <div className="space-y-2 mb-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Jami (mahsulotlar):</span>
                                <span className="font-semibold"> {currentPanelTotal.toLocaleString('uz-UZ')} so‘m </span>
                            </div>
                            {/* Tahrirlash rejimida qo'shimcha ma'lumotlar */}
                            {editingOrderId && orderToEdit && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Holati:</span>
                                        <Badge variant={ orderToEdit.status === 'completed' ? 'success' : orderToEdit.status === 'cancelled' ? 'destructive' : 'outline' } className="capitalize">
                                            {orderToEdit.status_display || orderToEdit.status}
                                        </Badge>
                                    </div>
                                     {/* Foizlar va Yakuniy narx (agar API'dan kelsa) */}
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
                        {/* Asosiy tugma (Saqlash yoki Buyurtma Berish) */}
                        {editingOrderId ? (
                            <Button
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                                onClick={submitEditedOrderChanges} // O'zgarishlarni API ga yuborish
                                disabled={isSubmittingEdit || isEditLoading || currentPanelItems.length === 0 || editError} // Xato bo'lsa ham bloklash
                                variant="default"
                            >
                                {isSubmittingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {/* Ikonkani Save ga o'zgartirdim */}
                                O'zgarishlarni Saqlash
                            </Button>
                        ) : (
                            <Button
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                                // Yangi buyurtma uchun validatsiya
                                disabled={
                                    cart.length === 0 || isLoading || isEditLoading || isSubmittingEdit ||
                                    (orderType === 'dine_in' && !selectedTable) ||
                                    ((orderType === 'takeaway' || orderType === 'delivery') && (!customerInfo.name || !customerInfo.phone)) ||
                                    (orderType === 'delivery' && !customerInfo.address)
                                }
                                onClick={submitOrder} // Yangi buyurtmani API ga yuborish
                            >
                                Buyurtma Berish ({currentPanelTotal.toLocaleString('uz-UZ')} so‘m)
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stol tanlash dialogi */}
            <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Stol tanlash</DialogTitle>
                        <DialogDescription>Yangi buyurtma uchun stol raqamini tanlang.</DialogDescription>
                    </DialogHeader>

                    {/* --- YANGI: Zona Filtr Select --- */}
                    <div className="mb-4 flex items-center gap-4 px-6 pt-4">
                        <Label htmlFor="zone-filter-select" className="shrink-0 text-sm">Zona bo'yicha filtr:</Label>
                        <Select value={selectedZoneFilter} onValueChange={setSelectedZoneFilter}>
                            <SelectTrigger id="zone-filter-select" className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Zonani tanlang" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueZones.map(zone => (
                                    <SelectItem key={zone} value={zone}>
                                        {zone === 'all' ? 'Barcha zonalar' : zone === 'N/A' ? 'Zonasiz' : zone}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* --- Zona Filtr Select Tugadi --- */}

                    <div className="px-6 pb-4">
                        {isLoadingTables ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <p className="text-muted-foreground ml-2">Stollar yuklanmoqda...</p>
                            </div>
                        ) : tables.filter(table => selectedZoneFilter === 'all' || (table.zone || 'N/A') === selectedZoneFilter).length === 0 ? (
                            // --- XABAR FILTRGA MOSLASHTIRILDI ---
                            <p className="col-span-full text-center text-muted-foreground py-10">
                                {selectedZoneFilter === 'all' ? 'Stollar topilmadi.' : `"${selectedZoneFilter === 'N/A' ? 'Zonasiz' : selectedZoneFilter}" zonasi uchun stol topilmadi.`}
                                {selectedZoneFilter !== 'all' && <Button variant="link" className="ml-2 p-0 h-auto" onClick={()=>setSelectedZoneFilter('all')}>Barchasini ko'rsatish</Button>}
                            </p>
                        ) : (
                            <ScrollArea className="max-h-[60vh] pr-3">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 mt-4">
                                    {/* --- STOLLAR FILTR BILAN CHIQARILADI --- */}
                                    {tables
                                        .filter(table => selectedZoneFilter === 'all' || (table.zone || 'N/A') === selectedZoneFilter) // FILTRLASH
                                        .sort((a, b) => { // Saralash (sonlar bo'yicha, keyin harflar bo'yicha)
                                            const nameA = parseInt(a.name);
                                            const nameB = parseInt(b.name);
                                            if (!isNaN(nameA) && !isNaN(nameB)) return nameA - nameB; // Sonlarni solishtirish
                                            // ---- KICHIK TUZATISH (isNaN(numB) o'rniga isNaN(nameB) bo'lishi kerak edi) ----
                                            if (!isNaN(nameA) && isNaN(nameB)) return -1; // Son harfdan oldin
                                            if (isNaN(nameA) && !isNaN(nameB)) return 1;  // Harf sondan keyin
                                            // -------------------------------------------------------------------------
                                            return a.name.localeCompare(b.name); // Harflarni solishtirish
                                        })
                                        .map((table) => (
                                            <Button
                                                key={table.id}
                                                variant="outline"
                                                // --- Stil ---
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
                                                disabled={!table.is_available} // Band stollarni bloklash
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
                             <Button variant="ghost">Bekor qilish</Button>
                         </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mijoz ma'lumotlari dialogi */}
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {orderType === "delivery" ? "Yetkazib berish ma‘lumotlari" : "Mijoz ma‘lumotlari"}
                        </DialogTitle>
                        <DialogDescription>
                            {orderType === "delivery" ? "Yetkazib berish uchun mijoz ma‘lumotlarini kiriting." : "Olib ketish uchun mijoz ma‘lumotlarini kiriting."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name-dialog">Ism*</Label>
                            <Input id="customer-name-dialog" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} placeholder="Mijozning ismi" required/>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-phone-dialog">Telefon*</Label>
                            <Input id="customer-phone-dialog" type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} placeholder="+998 XX XXX XX XX" required/>
                        </div>
                        {orderType === "delivery" && (
                            <div className="space-y-2">
                                <Label htmlFor="customer-address-dialog">Manzil*</Label>
                                <Input
                                    id="customer-address-dialog"
                                    value={customerInfo.address}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                                    placeholder="Yetkazib berish manzili"
                                    required
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Bekor qilish</Button>
                        </DialogClose>
                        <Button
                            onClick={handleCustomerInfoSave}
                            disabled={
                                !customerInfo.name ||
                                !customerInfo.phone ||
                                (orderType === "delivery" && !customerInfo.address)
                            }
                        >
                            Saqlash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Chiqish dialog modali */}
            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Chiqishni tasdiqlash</DialogTitle>
                        <DialogDescription>Rostdan ham tizimdan chiqmoqchimisiz?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex justify-end gap-2">
                        <DialogClose asChild>
                            <Button variant="outline">Bekor qilish</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={handleLogout}>
                            Chiqish
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Buyurtmalar Tarixi dialogi */}
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-7xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Buyurtmalar Tarixi</DialogTitle>
                        <DialogDescription>O'tgan buyurtmalarni ko'rish. Tahrirlash uchun ustiga bosing (tayyor yoki bekor qilinganlarni tahrirlab bo'lmaydi).</DialogDescription>
                    </DialogHeader>
                    <div className="px-6 py-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="ID, mijoz, tel, stol bo'yicha qidirish..."
                                className="w-full rounded-lg bg-background pl-8"
                                value={historySearchQuery}
                                onChange={(e) => setHistorySearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden px-1">
                        <ScrollArea className="h-full px-5 pb-6">
                            {isHistoryLoading ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Yuklanmoqda...
                                </div>
                            ) : historyError ? (
                                <div className="flex h-full items-center justify-center text-destructive">{historyError}</div>
                            ) : orderHistory.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    {historySearchQuery ? `"${historySearchQuery}" uchun buyurtma topilmadi.` : "Buyurtmalar tarixi hozircha bo'sh."}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {[...orderHistory] // Nusxa olish muhim
                                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Oxirgisidan boshlab
                                        .map((order) => (
                                        <Card
                                            key={order.id}
                                            className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${order.status === 'completed' || order.status === 'cancelled' ? 'opacity-70' : 'cursor-pointer'}`}
                                            onClick={() => {
                                                // Tahrirlashga ruxsat berilmagan holatlar
                                                if (order.status === 'completed' || order.status === 'cancelled') {
                                                     toast.warn(`Bu buyurtma (${order.status_display}) holatida, tahrirlab bo'lmaydi.`);
                                                     return;
                                                }
                                                // Agar boshqa buyurtma yuklanayotgan yoki saqlanayotgan bo'lsa
                                                if (isEditLoading || isSubmittingEdit) {
                                                    toast.info("Iltimos, avvalgi amal tugashini kuting.");
                                                    return;
                                                }
                                                 // Agar shu buyurtma allaqachon tahrirlanayotgan bo'lsa, qayta bosishni o'tkazib yuborish
                                                 if (editingOrderId === order.id) {
                                                     console.log(`Buyurtma #${order.id} allaqachon tahrirlanmoqda.`);
                                                     setShowHistoryDialog(false); // Dialog oynani yopish
                                                     return;
                                                 }
                                                loadOrderForEditing(order.id); // Tahrirlash uchun yuklash
                                            }}
                                        >
                                            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-6 md:grid-cols-8 gap-x-4 gap-y-2 text-sm">
                                                {/* Buyurtma ID va Sana */}
                                                <div className="sm:col-span-2 md:col-span-2 space-y-1">
                                                    <div className="font-medium">ID: <span className="text-primary font-semibold">{order.id}</span></div>
                                                    <div className="text-muted-foreground text-xs">{formatDateTime(order.created_at)}</div>
                                                </div>
                                                {/* Buyurtma Turi va Holati */}
                                                <div className="sm:col-span-2 md:col-span-2 space-y-1 flex flex-col items-start">
                                                    <Badge variant="outline">{order.order_type_display || order.order_type}</Badge>
                                                    <Badge
                                                        variant={
                                                            order.status === 'completed' ? 'success' :
                                                            order.status === 'pending' || order.status === 'ready' ? 'secondary' :
                                                            order.status === 'paid' ? 'default' :
                                                            order.status === 'cancelled' ? 'destructive' : 'outline'
                                                        }
                                                        className="mt-1 capitalize"
                                                    >
                                                        {order.status_display || order.status}
                                                    </Badge>
                                                </div>
                                                {/* Mijoz/Stol Ma'lumotlari */}
                                                <div className="sm:col-span-2 md:col-span-2 space-y-1">
                                                    {order.customer_name && <div className="truncate" title={order.customer_name}>Mijoz: <span className="font-medium">{order.customer_name}</span></div>}
                                                    {order.table_name && <div>Stol: <span className="font-medium">{order.table_name}</span>{order.table_zone && <span className='text-xs text-muted-foreground'> ({order.table_zone})</span>}</div>}
                                                    {order.customer_phone && <div className="text-xs text-muted-foreground">{order.customer_phone}</div>}
                                                </div>
                                                {/* Jami Summa va Mahsulot Soni */}
                                                <div className="sm:col-span-6 md:col-span-2 space-y-1 text-right sm:text-left md:text-right pt-2 sm:pt-0 md:pt-0 flex flex-col items-end justify-between">
                                                    <div>
                                                      <div className="font-semibold text-base">{Number(order.final_price || 0).toLocaleString('uz-UZ')} so'm</div>
                                                      <div className="text-muted-foreground text-xs">{order.item_count || 'Noma\'lum'} ta mahsulot</div>
                                                    </div>
                                                    {/* Qayta Buyurtma Berish Tugmasi (Faqat Tayyor uchun) */}
                                                    {order.status === 'completed' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2 text-xs"
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Card bosilishini oldini olish
                                                                reorderToSameTable(order);
                                                            }}
                                                            disabled={isEditLoading || isSubmittingEdit} // Agar boshqa jarayon ketayotgan bo'lsa, bloklash
                                                        >
                                                            <Repeat className="h-3 w-3 mr-1" /> Qayta Buyurtma
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                            {/* Yuklanish Indikatori (Agar shu buyurtma tahrirlash uchun yuklanayotgan bo'lsa) */}
                                            {isEditLoading && editingOrderId === order.id && (
                                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                </div>
                                            )}
                                            {/* Tahrirlash belgisini ko'rsatish (agar tahrirlash mumkin bo'lsa) */}
                                             {(order.status !== 'completed' && order.status !== 'cancelled') && (
                                                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                     <Edit className="h-4 w-4 text-muted-foreground"/>
                                                 </div>
                                             )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <DialogFooter className="px-6 py-3 border-t">
                        <DialogClose asChild>
                            <Button variant="outline">Yopish</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    </TooltipProvider>
  )
}