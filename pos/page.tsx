"use client"

import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, Search, ShoppingBag, ShoppingCart, Truck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Kategoriyalar (demo ma'lumotlar)
const categories = [
  { id: 1, name: "Issiq taomlar", value: "food" },
  { id: 2, name: "Salatlar", value: "salad" },
  { id: 3, name: "Ichimliklar", value: "drink" },
  { id: 4, name: "Desertlar", value: "dessert" },
  { id: 5, name: "Fast Food", value: "fastfood" },
  { id: 6, name: "Milliy taomlar", value: "national" },
]

// Demo mahsulotlar
const demoProducts = [
  {
    id: 1,
    name: "Osh",
    price: 35000,
    category: "national",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 2,
    name: "Lag'mon",
    price: 30000,
    category: "national",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 3,
    name: "Coca-Cola",
    price: 12000,
    category: "drink",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 4,
    name: "Olivye salat",
    price: 25000,
    category: "salad",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 5,
    name: "Qaymoqli tort",
    price: 28000,
    category: "dessert",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 6,
    name: "Burger",
    price: 32000,
    category: "fastfood",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 7,
    name: "Shashlik",
    price: 45000,
    category: "national",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 8,
    name: "Qo'y sho'rva",
    price: 40000,
    category: "national",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 9,
    name: "Pepsi",
    price: 12000,
    category: "drink",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 10,
    name: "Lavash",
    price: 28000,
    category: "fastfood",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 11,
    name: "Choy",
    price: 5000,
    category: "drink",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
  {
    id: 12,
    name: "Manti",
    price: 5000,
    category: "national",
    image: "/placeholder.svg?height=80&width=80",
    available: true,
  },
]

// Demo stollar
const demoTables = [
  { id: 1, name: "Stol 1", number: 1, section: "Zal", place: "hall", isOccupied: false },
  { id: 2, name: "Stol 2", number: 2, section: "Zal", place: "hall", isOccupied: false },
  { id: 3, name: "Stol 3", number: 3, section: "Zal", place: "hall", isOccupied: true },
  { id: 4, name: "Stol 4", number: 4, section: "Zal", place: "hall", isOccupied: false },
  { id: 5, name: "Stol 5", number: 5, section: "Zal", place: "hall", isOccupied: true },
  { id: 6, name: "Stol 6", number: 6, section: "Zal", place: "hall", isOccupied: false },
  { id: 7, name: "Stol 7", number: 7, section: "Podval", place: "basement", isOccupied: false },
  { id: 8, name: "Stol 8", number: 8, section: "Podval", place: "basement", isOccupied: false },
  { id: 9, name: "Stol 9", number: 9, section: "Podval", place: "basement", isOccupied: false },
  { id: 10, name: "Stol 10", number: 10, section: "2-etaj", place: "second_floor", isOccupied: false },
  { id: 11, name: "Stol 11", number: 11, section: "2-etaj", place: "second_floor", isOccupied: false },
  { id: 12, name: "Stol 12", number: 12, section: "2-etaj", place: "second_floor", isOccupied: false },
]

// Statik joylar ro'yxati
const places = [
  { id: 1, name: "Zal", value: "hall" },
  { id: 2, name: "2-qavat", value: "second_floor" },
  { id: 3, name: "Podval", value: "basement" },
]

export default function POSPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<Array<{ id: number; product: any; quantity: number }>>([])
  const [orderType, setOrderType] = useState("dine-in") // dine-in, takeaway, delivery
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
  })
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAddFoodDialog, setShowAddFoodDialog] = useState(false)
  const [newFood, setNewFood] = useState({
    name: "",
    price: "",
    category: "food",
    image: null as File | null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tables, setTables] = useState<any[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(true)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Kategoriyadagi va qidiruv so'roviga mos kelgan mahsulotlar
  const filteredProducts = products.filter(
    (product) =>
      (selectedCategory === null || categories.find((c) => c.value === product.category)?.id === selectedCategory) &&
      (searchQuery === "" || product.name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Stollarni filtrlash
  const filteredTables = tables
    .filter((table) => {
      const placeFilter = selectedPlace ? table.place === selectedPlace : true
      return placeFilter
    })
    .map((table) => ({
      ...table,
      isDisabled: table.isOccupied, // Band stollarni disable qilish
    }))

  // Demo ma'lumotlarni yuklash
  useEffect(() => {
    // Foydalanuvchi autentifikatsiyasini tekshirish
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth")
      return
    }

    // Demo mahsulotlarni yuklash
    setProducts(demoProducts)
    setIsLoading(false)

    // Demo stollarni yuklash
    setTables(demoTables)
    setIsLoadingTables(false)
  }, [router])

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.product.id === product.id)
    if (existingItem) {
      setCart(cart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { id: Date.now(), product, quantity: 1 }])
    }
  }

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
    } else {
      setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)))
    }
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0)
  }

  const handleOrderTypeChange = (value: string) => {
    setOrderType(value)
    if (value === "dine-in") {
      setShowTableDialog(true)
    } else if (value === "delivery" || value === "takeaway") {
      setShowCustomerDialog(true)
    }
  }

  const handleTableSelect = (tableId: number) => {
    setSelectedTable(tableId)
    setShowTableDialog(false)
  }

  const handleSubmitOrder = async () => {
    try {
      // Demo buyurtma yaratish
      const orderData = {
        id: Math.floor(Math.random() * 1000) + 1,
        items: cart.map((item) => ({
          menu_item: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        order_type: orderType,
        status: "pending",
        total_price: calculateTotal(),
        created_at: new Date().toISOString(),
      }

      // Agar "dine-in" bo'lsa stol qo'shish
      if (orderType === "dine-in" && selectedTable) {
        // Stolni band qilish
        setTables(tables.map((table) => (table.id === selectedTable ? { ...table, isOccupied: true } : table)))
      }

      console.log("Buyurtma yaratildi:", orderData)
      alert("Buyurtma muvaffaqiyatli yuborildi!")

      // Savatni tozalash
      setCart([])
      setSelectedTable(null)
      setCustomerInfo({ name: "", phone: "", address: "" })
    } catch (error: any) {
      console.error("Buyurtma yuborishda xatolik:", error)
      alert(`Buyurtmani yuborishda xatolik: ${error.message || "Noma'lum xato"}`)
    }
  }

  const initiateLogout = () => {
    setShowLogoutDialog(true)
  }

  const confirmLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refresh")
    localStorage.removeItem("user")
    router.push("/auth")
  }

  const handleAddFood = async () => {
    try {
      setIsSubmitting(true)

      // Demo yangi mahsulot qo'shish
      const newId = Math.max(...products.map((p) => p.id)) + 1
      const newProduct = {
        id: newId,
        name: newFood.name,
        price: Number(newFood.price),
        category: newFood.category,
        image: "/placeholder.svg?height=80&width=80", // Demo rasm
        available: true,
      }

      // Mahsulotlar ro'yxatiga qo'shish
      setProducts([...products, newProduct])

      alert("Ovqat muvaffaqiyatli qo'shildi!")
      setShowAddFoodDialog(false)
      setNewFood({
        name: "",
        price: "",
        category: "food",
        image: null,
      })
    } catch (error: any) {
      alert(`Xatolik: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={initiateLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">SmartResto POS</h1>
          <Button variant="outline" onClick={() => setShowAddFoodDialog(true)}>
            + Mahsulot qo'shish
          </Button>
        </div>
        <div className="flex items-center space-x-4">
          <Tabs defaultValue="dine-in" onValueChange={handleOrderTypeChange} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dine-in" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Shu yerda
              </TabsTrigger>
              <TabsTrigger value="takeaway" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Olib ketish
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Yetkazib berish
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Categories and Products */}
        <div className="flex w-2/3 flex-col border-r">
          {/* Search and categories */}
          <div className="border-b p-4">
            <div className="relative mb-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Qidirish..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="whitespace-nowrap pb-2">
              <div className="flex space-x-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setSelectedCategory(null)}
                >
                  Barchasi
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Products grid */}
          <ScrollArea className="flex-1 p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p>Yuklanmoqda...</p>
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>Qayta yuklash</Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-3 flex h-40 items-center justify-center text-muted-foreground">
                    <p>Mahsulotlar topilmadi</p>
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className={`cursor-pointer overflow-hidden transition-all hover:shadow-md h-[300px] ${
                        !product.available ? "opacity-50" : ""
                      }`}
                      onClick={() => product.available && addToCart(product)}
                    >
                      <CardContent className="p-0 h-full flex flex-col">
                        <div className="h-[200px] relative">
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            style={{ display: product.image ? "block" : "none" }}
                          />
                        </div>
                        <div className="p-4 flex-1">
                          <h3 className="font-medium text-lg">{product.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{product.price.toLocaleString()} so'm</p>
                          {!product.available && <p className="text-xs text-destructive mt-1">Mavjud emas</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right sidebar - Cart */}
        <div className="flex w-1/3 flex-col">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-medium">Buyurtma</h2>
            </div>
            {orderType === "dine-in" && selectedTable && (
              <Badge variant="outline" className="text-sm">
                {tables.find((t) => t.id === selectedTable)?.name}
              </Badge>
            )}
            {orderType === "dine-in" && (
              <Button variant="outline" size="sm" onClick={() => setShowTableDialog(true)}>
                {selectedTable ? "Stolni o'zgartirish" : "Stol tanlash"}
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <ShoppingCart className="mb-2 h-12 w-12" />
                <h3 className="text-lg font-medium">Savat bo'sh</h3>
                <p className="text-sm">Buyurtma berish uchun mahsulotlarni tanlang</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between space-x-2">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.name}</h3>
                      <p className="text-sm text-muted-foreground">{item.product.price.toLocaleString()} so'm</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{(item.product.price * item.quantity).toLocaleString()} so'm</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Jami:</span>
                <span className="font-medium">{calculateTotal().toLocaleString()} so'm</span>
              </div>
            </div>
            <Separator className="my-4" />
            <Button
              className="w-full"
              size="lg"
              disabled={
                cart.length === 0 ||
                (orderType === "dine-in" && !selectedTable) ||
                ((orderType === "takeaway" || orderType === "delivery") &&
                  (!customerInfo.name || !customerInfo.phone || (orderType === "delivery" && !customerInfo.address)))
              }
              onClick={handleSubmitOrder}
            >
              Buyurtmani yuborish
            </Button>
          </div>
        </div>
      </div>

      {/* Table selection dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Stol tanlash</DialogTitle>
            <DialogDescription>Buyurtma uchun stol raqamini tanlang</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 flex space-x-2">
              <Select value={selectedPlace || ""} onValueChange={(value) => setSelectedPlace(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Joyni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {places.map((place) => (
                    <SelectItem key={place.id} value={place.value}>
                      {place.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLoadingTables ? (
              <div className="flex justify-center items-center h-40">
                <p>Stollar yuklanmoqda...</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {filteredTables.map((table) => (
                  <Button
                    key={table.id}
                    variant={selectedTable === table.id ? "default" : "outline"}
                    className={`h-16 ${table.isOccupied ? "bg-red-100 text-muted-foreground cursor-not-allowed" : "bg-green-100"}`}
                    disabled={table.isOccupied}
                    onClick={() => !table.isOccupied && handleTableSelect(table.id)}
                  >
                    <div className="text-center">
                      <div className="font-medium">Stol {table.number}</div>
                      <div className="text-xs text-gray-600">{table.isOccupied ? "Band" : "Bo'sh"}</div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Bekor qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer info dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {orderType === "delivery" ? "Yetkazib berish ma'lumotlari" : "Mijoz ma'lumotlari"}
            </DialogTitle>
            <DialogDescription>
              {orderType === "delivery"
                ? "Yetkazib berish uchun mijoz ma'lumotlarini kiriting"
                : "Olib ketish uchun mijoz ma'lumotlarini kiriting"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Ism
              </Label>
              <Input
                id="name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Telefon
              </Label>
              <Input
                id="phone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            {orderType === "delivery" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Manzil
                </Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => setShowCustomerDialog(false)}
              disabled={
                !customerInfo.name || !customerInfo.phone || (orderType === "delivery" && !customerInfo.address)
              }
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Food Dialog */}
      <Dialog open={showAddFoodDialog} onOpenChange={setShowAddFoodDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi ovqat qo'shish</DialogTitle>
            <DialogDescription>Yangi ovqat ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="food-name" className="text-right">
                Nomi
              </Label>
              <Input
                id="food-name"
                value={newFood.name}
                onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                className="col-span-3"
                placeholder="Ovqat nomi"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="food-price" className="text-right">
                Narxi
              </Label>
              <Input
                id="food-price"
                type="number"
                value={newFood.price}
                onChange={(e) => setNewFood({ ...newFood, price: e.target.value })}
                className="col-span-3"
                placeholder="25000"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="food-category" className="text-right">
                Kategoriya
              </Label>
              <Select value={newFood.category} onValueChange={(value) => setNewFood({ ...newFood, category: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Kategoriyani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Issiq taomlar</SelectItem>
                  <SelectItem value="salad">Salatlar</SelectItem>
                  <SelectItem value="drink">Ichimliklar</SelectItem>
                  <SelectItem value="dessert">Desertlar</SelectItem>
                  <SelectItem value="fastfood">Fast Food</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="food-image" className="text-right">
                Rasm
              </Label>
              <Input
                id="food-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setNewFood({ ...newFood, image: file })
                  }
                }}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFoodDialog(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddFood} disabled={!newFood.name || !newFood.price || isSubmitting}>
              {isSubmitting ? "Qo'shilmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chiqish dialog modali */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Chiqishni tasdiqlash</DialogTitle>
            <DialogDescription>Rostdan ham chiqishni xohlaysizmi?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Bekor qilish
            </Button>
            <Button variant="destructive" onClick={confirmLogout}>
              Chiqish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
