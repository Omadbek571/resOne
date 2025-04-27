"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Calendar,
  ChevronDown,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Home,
  LogOut,
  PieChart,
  Plus,
  Settings,
  ShoppingCart,
  Sliders,
  Store,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Mock data for dashboard
const salesData = [
  { date: "Dushanba", amount: 1250000 },
  { date: "Seshanba", amount: 1420000 },
  { date: "Chorshanba", amount: 1380000 },
  { date: "Payshanba", amount: 1520000 },
  { date: "Juma", amount: 1850000 },
  { date: "Shanba", amount: 2100000 },
  { date: "Yakshanba", amount: 1950000 },
]

const topProducts = [
  { name: "Osh", quantity: 145, revenue: 5075000 },
  { name: "Lag'mon", quantity: 98, revenue: 2940000 },
  { name: "Shashlik", quantity: 87, revenue: 3915000 },
  { name: "Burger", quantity: 76, revenue: 2432000 },
  { name: "Coca-Cola", quantity: 210, revenue: 2520000 },
]

const employees = [
  {
    id: 1,
    name: "Alisher Karimov",
    role: "Afitsiant",
    pin: "1234",
    status: "active",
    image: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    name: "Dilshod Rahimov",
    role: "Oshpaz",
    pin: "5678",
    status: "active",
    image: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    name: "Nodira Azizova",
    role: "Kassir",
    pin: "9012",
    status: "active",
    image: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 4,
    name: "Jahongir Umarov",
    role: "Administrator",
    pin: "3456",
    status: "active",
    image: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 5,
    name: "Sardor Mahmudov",
    role: "Yetkazuvchi",
    pin: "7890",
    status: "inactive",
    image: "/placeholder.svg?height=40&width=40",
  },
]

const roles = [
  { id: 1, name: "Afitsiant", permissions: ["pos_access", "order_create"], count: 5 },
  { id: 2, name: "Oshpaz", permissions: ["kitchen_access", "order_update"], count: 3 },
  { id: 3, name: "Kassir", permissions: ["cashier_access", "payment_process"], count: 2 },
  { id: 4, name: "Administrator", permissions: ["admin_access", "all_reports", "employee_manage"], count: 1 },
  { id: 5, name: "Yetkazuvchi", permissions: ["delivery_access", "order_update"], count: 4 },
]

const recentOrders = [
  { id: 1, customer: "Stol 3", items: 5, total: 136000, status: "completed", date: "2023-05-15 14:30" },
  { id: 2, customer: "Alisher", items: 3, total: 84000, status: "completed", date: "2023-05-15 15:45" },
  { id: 3, customer: "Stol 5", items: 2, total: 38000, status: "completed", date: "2023-05-15 16:20" },
  { id: 4, customer: "Dilshod", items: 7, total: 215000, status: "completed", date: "2023-05-15 17:10" },
  { id: 5, customer: "Stol 1", items: 4, total: 125000, status: "completed", date: "2023-05-15 18:05" },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState(false)
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false)
  const [dateRange, setDateRange] = useState("weekly")

  const handleLogout = () => {
    router.push("/auth")
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="hidden w-64 flex-col bg-slate-800 text-white md:flex">
        <div className="flex h-14 items-center border-b border-slate-700 px-4">
          <Store className="mr-2 h-6 w-6" />
          <h1 className="text-lg font-bold">SmartResto Admin</h1>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Asosiy</h2>
            <div className="space-y-1">
              <Button
                variant={activeTab === "dashboard" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("dashboard")}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Boshqaruv paneli
              </Button>
              <Button
                variant={activeTab === "reports" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("reports")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Hisobotlar
              </Button>
              <Button
                variant={activeTab === "employees" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("employees")}
              >
                <Users className="mr-2 h-4 w-4" />
                Xodimlar
              </Button>
              <Button
                variant={activeTab === "roles" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("roles")}
              >
                <Sliders className="mr-2 h-4 w-4" />
                Rollar
              </Button>
              <Button
                variant={activeTab === "orders" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("orders")}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Buyurtmalar
              </Button>
            </div>
            <h2 className="mb-2 mt-6 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Tizim</h2>
            <div className="space-y-1">
              <Button
                variant={activeTab === "settings" ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="mr-2 h-4 w-4" />
                Sozlamalar
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => router.push("/pos")}>
                <Home className="mr-2 h-4 w-4" />
                POS ga qaytish
              </Button>
              <Button variant="ghost" className="w-full justify-start text-red-400" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Chiqish
              </Button>
            </div>
          </div>
        </ScrollArea>
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>JU</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Jahongir Umarov</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b bg-white px-4 dark:bg-slate-900">
          <div className="flex items-center md:hidden">
            <Store className="mr-2 h-6 w-6" />
            <h1 className="text-lg font-bold">SmartResto</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden md:flex">
              <Calendar className="mr-2 h-4 w-4" />
              {new Date().toLocaleDateString("uz-UZ")}
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="/placeholder.svg?height=24&width=24" />
                    <AvatarFallback>JU</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">Jahongir Umarov</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mening hisobim</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profil</DropdownMenuItem>
                <DropdownMenuItem>Sozlamalar</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Chiqish</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-4 dark:bg-slate-900">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Bugungi savdo</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,850,000 so'm</div>
                  <p className="text-xs text-muted-foreground">+20.1% o'tgan haftaga nisbatan</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Buyurtmalar</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+48</div>
                  <p className="text-xs text-muted-foreground">+12.2% o'tgan haftaga nisbatan</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">O'rtacha chek</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">59,375 so'm</div>
                  <p className="text-xs text-muted-foreground">+2.5% o'tgan haftaga nisbatan</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Faol xodimlar</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">+2 o'tgan oyga nisbatan</p>
                </CardContent>
              </Card>

              <Card className="col-span-full md:col-span-2">
                <CardHeader>
                  <CardTitle>Haftalik savdo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full">
                    {/* This would be a chart in a real app */}
                    <div className="flex h-full items-end gap-2">
                      {salesData.map((day) => (
                        <div key={day.date} className="relative flex w-full flex-col items-center">
                          <div
                            className="w-full rounded-md bg-primary"
                            style={{
                              height: `${(day.amount / 2100000) * 100}%`,
                            }}
                          />
                          <span className="mt-2 text-xs">{day.date.substring(0, 2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-full md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Eng ko'p sotilgan mahsulotlar</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Haftalik <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Kunlik</DropdownMenuItem>
                      <DropdownMenuItem>Haftalik</DropdownMenuItem>
                      <DropdownMenuItem>Oylik</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahsulot</TableHead>
                        <TableHead className="text-right">Miqdor</TableHead>
                        <TableHead className="text-right">Savdo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((product) => (
                        <TableRow key={product.name}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">{product.revenue.toLocaleString()} so'm</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="col-span-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>So'nggi buyurtmalar</CardTitle>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Mijoz</TableHead>
                        <TableHead>Mahsulotlar</TableHead>
                        <TableHead>Jami</TableHead>
                        <TableHead>Holat</TableHead>
                        <TableHead>Sana</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>#{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.items}</TableCell>
                          <TableCell>{order.total.toLocaleString()} so'm</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              {order.status === "completed" ? "Yakunlangan" : "Jarayonda"}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="flex items-center justify-center border-t px-6 py-4">
                  <Button variant="outline" className="w-full">
                    Barcha buyurtmalarni ko'rish
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Hisobotlar</h2>
                <div className="flex items-center gap-2">
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Vaqt oralig'i" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Kunlik</SelectItem>
                      <SelectItem value="weekly">Haftalik</SelectItem>
                      <SelectItem value="monthly">Oylik</SelectItem>
                      <SelectItem value="yearly">Yillik</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="sales">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="sales">Savdo</TabsTrigger>
                  <TabsTrigger value="products">Mahsulotlar</TabsTrigger>
                  <TabsTrigger value="employees">Xodimlar</TabsTrigger>
                  <TabsTrigger value="customers">Mijozlar</TabsTrigger>
                </TabsList>
                <TabsContent value="sales" className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Jami savdo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">11,470,000 so'm</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Buyurtmalar soni</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">193</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">O'rtacha chek</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">59,430 so'm</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Foyda</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">4,588,000 so'm</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Savdo dinamikasi</CardTitle>
                      <CardDescription>
                        {dateRange === "weekly"
                          ? "So'nggi 7 kun"
                          : dateRange === "monthly"
                            ? "So'nggi 30 kun"
                            : dateRange === "yearly"
                              ? "So'nggi 12 oy"
                              : "Bugun"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        {/* This would be a chart in a real app */}
                        <div className="flex h-full items-end gap-2">
                          {salesData.map((day) => (
                            <div key={day.date} className="relative flex w-full flex-col items-center">
                              <div
                                className="w-full rounded-md bg-primary"
                                style={{
                                  height: `${(day.amount / 2100000) * 100}%`,
                                }}
                              />
                              <span className="mt-2 text-xs">{day.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>To'lov usullari</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          {/* This would be a pie chart in a real app */}
                          <div className="flex h-full items-center justify-center">
                            <PieChart className="h-32 w-32 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">45%</div>
                            <div className="text-xs text-muted-foreground">Naqd</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">35%</div>
                            <div className="text-xs text-muted-foreground">Karta</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">20%</div>
                            <div className="text-xs text-muted-foreground">Mobil</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Buyurtma turlari</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px]">
                          {/* This would be a pie chart in a real app */}
                          <div className="flex h-full items-center justify-center">
                            <PieChart className="h-32 w-32 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold">60%</div>
                            <div className="text-xs text-muted-foreground">Shu yerda</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">25%</div>
                            <div className="text-xs text-muted-foreground">Olib ketish</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold">15%</div>
                            <div className="text-xs text-muted-foreground">Yetkazib berish</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="products" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mahsulotlar bo'yicha hisobot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mahsulot</TableHead>
                            <TableHead className="text-right">Sotilgan</TableHead>
                            <TableHead className="text-right">Savdo</TableHead>
                            <TableHead className="text-right">Foyda</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topProducts.map((product) => (
                            <TableRow key={product.name}>
                              <TableCell>{product.name}</TableCell>
                              <TableCell className="text-right">{product.quantity}</TableCell>
                              <TableCell className="text-right">{product.revenue.toLocaleString()} so'm</TableCell>
                              <TableCell className="text-right">
                                {Math.round(product.revenue * 0.4).toLocaleString()} so'm
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="employees" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Xodimlar bo'yicha hisobot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Xodim</TableHead>
                            <TableHead>Lavozim</TableHead>
                            <TableHead className="text-right">Buyurtmalar</TableHead>
                            <TableHead className="text-right">Savdo</TableHead>
                            <TableHead className="text-right">O'rtacha chek</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Alisher Karimov</TableCell>
                            <TableCell>Afitsiant</TableCell>
                            <TableCell className="text-right">45</TableCell>
                            <TableCell className="text-right">2,650,000 so'm</TableCell>
                            <TableCell className="text-right">58,889 so'm</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Nodira Azizova</TableCell>
                            <TableCell>Kassir</TableCell>
                            <TableCell className="text-right">78</TableCell>
                            <TableCell className="text-right">4,520,000 so'm</TableCell>
                            <TableCell className="text-right">57,949 so'm</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Sardor Mahmudov</TableCell>
                            <TableCell>Yetkazuvchi</TableCell>
                            <TableCell className="text-right">32</TableCell>
                            <TableCell className="text-right">1,850,000 so'm</TableCell>
                            <TableCell className="text-right">57,813 so'm</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="customers" className="space-y-4 pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Mijozlar bo'yicha hisobot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mijoz turi</TableHead>
                            <TableHead className="text-right">Buyurtmalar</TableHead>
                            <TableHead className="text-right">Savdo</TableHead>
                            <TableHead className="text-right">O'rtacha chek</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>Doimiy mijozlar</TableCell>
                            <TableCell className="text-right">85</TableCell>
                            <TableCell className="text-right">5,250,000 so'm</TableCell>
                            <TableCell className="text-right">61,765 so'm</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Yangi mijozlar</TableCell>
                            <TableCell className="text-right">65</TableCell>
                            <TableCell className="text-right">3,750,000 so'm</TableCell>
                            <TableCell className="text-right">57,692 so'm</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Bir martalik mijozlar</TableCell>
                            <TableCell className="text-right">43</TableCell>
                            <TableCell className="text-right">2,470,000 so'm</TableCell>
                            <TableCell className="text-right">57,442 so'm</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Employees Tab */}
          {activeTab === "employees" && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Xodimlar</h2>
                <Button onClick={() => setShowAddEmployeeDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yangi xodim qo'shish
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Xodim</TableHead>
                        <TableHead>Lavozim</TableHead>
                        <TableHead>PIN-kod</TableHead>
                        <TableHead>Holat</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={employee.image} />
                                <AvatarFallback>
                                  {employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{employee.role}</TableCell>
                          <TableCell>{employee.pin}</TableCell>
                          <TableCell>
                            <Badge
                              variant={employee.status === "active" ? "success" : "outline"}
                              className={
                                employee.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-slate-100 text-slate-800"
                              }
                            >
                              {employee.status === "active" ? "Faol" : "Faol emas"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Tahrirlash</DropdownMenuItem>
                                <DropdownMenuItem>PIN-kodni o'zgartirish</DropdownMenuItem>
                                <DropdownMenuItem>Holatni o'zgartirish</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">O'chirish</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Rollar</h2>
                <Button onClick={() => setShowAddRoleDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Yangi rol qo'shish
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rol nomi</TableHead>
                        <TableHead>Huquqlar</TableHead>
                        <TableHead>Xodimlar soni</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="font-medium">{role.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.map((permission) => (
                                <Badge key={permission} variant="outline" className="bg-slate-100">
                                  {permission}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{role.count}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Tahrirlash</DropdownMenuItem>
                                <DropdownMenuItem>Huquqlarni o'zgartirish</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">O'chirish</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold tracking-tight">Buyurtmalar</h2>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Holat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barchasi</SelectItem>
                      <SelectItem value="completed">Yakunlangan</SelectItem>
                      <SelectItem value="processing">Jarayonda</SelectItem>
                      <SelectItem value="cancelled">Bekor qilingan</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Mijoz</TableHead>
                        <TableHead>Mahsulotlar</TableHead>
                        <TableHead>Jami</TableHead>
                        <TableHead>Holat</TableHead>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right">Amallar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>#{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.items}</TableCell>
                          <TableCell>{order.total.toLocaleString()} so'm</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              {order.status === "completed" ? "Yakunlangan" : "Jarayonda"}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.date}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Batafsil</DropdownMenuItem>
                                <DropdownMenuItem>Chek chiqarish</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">Bekor qilish</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Sozlamalar</h2>

              <Card>
                <CardHeader>
                  <CardTitle>Restoran ma'lumotlari</CardTitle>
                  <CardDescription>Restoran haqidagi asosiy ma'lumotlarni o'zgartirish</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-name">Restoran nomi</Label>
                      <Input id="restaurant-name" defaultValue="SmartResto" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-phone">Telefon raqami</Label>
                      <Input id="restaurant-phone" defaultValue="+998 71 123 45 67" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-address">Manzil</Label>
                      <Input id="restaurant-address" defaultValue="Toshkent sh., Chilonzor tumani" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="restaurant-email">Email</Label>
                      <Input id="restaurant-email" defaultValue="info@smartresto.uz" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restaurant-description">Tavsif</Label>
                    <Input id="restaurant-description" defaultValue="Milliy va zamonaviy taomlar restorani" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Saqlash</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tizim sozlamalari</CardTitle>
                  <CardDescription>Tizimning asosiy sozlamalarini o'zgartirish</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Valyuta</Label>
                      <Select defaultValue="uzs">
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="Valyuta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uzs">So'm (UZS)</SelectItem>
                          <SelectItem value="usd">Dollar (USD)</SelectItem>
                          <SelectItem value="eur">Yevro (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Til</Label>
                      <Select defaultValue="uz">
                        <SelectTrigger id="language">
                          <SelectValue placeholder="Til" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uz">O'zbek</SelectItem>
                          <SelectItem value="ru">Rus</SelectItem>
                          <SelectItem value="en">Ingliz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-rate">Soliq stavkasi (%)</Label>
                      <Input id="tax-rate" type="number" defaultValue="12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="service-fee">Xizmat haqi (%)</Label>
                      <Input id="service-fee" type="number" defaultValue="10" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Saqlash</Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployeeDialog} onOpenChange={setShowAddEmployeeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi xodim qo'shish</DialogTitle>
            <DialogDescription>
              Yangi xodim ma'lumotlarini kiriting. Xodim yaratilgandan so'ng unga PIN-kod beriladi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Ism familiya
              </Label>
              <Input id="name" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Lavozim
              </Label>
              <Select>
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Lavozimni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiter">Afitsiant</SelectItem>
                  <SelectItem value="chef">Oshpaz</SelectItem>
                  <SelectItem value="cashier">Kassir</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="delivery">Yetkazuvchi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pin" className="text-right">
                PIN-kod
              </Label>
              <Input id="pin" type="password" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Holat
              </Label>
              <Select defaultValue="active">
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Holatni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Faol</SelectItem>
                  <SelectItem value="inactive">Faol emas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmployeeDialog(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => setShowAddEmployeeDialog(false)}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Yangi rol qo'shish</DialogTitle>
            <DialogDescription>Yangi rol ma'lumotlarini kiriting va unga huquqlar bering.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role-name" className="text-right">
                Rol nomi
              </Label>
              <Input id="role-name" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="permissions" className="text-right">
                Huquqlar
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="pos_access" />
                  <Label htmlFor="pos_access">POS tizimiga kirish</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="kitchen_access" />
                  <Label htmlFor="kitchen_access">Oshxonaga kirish</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="cashier_access" />
                  <Label htmlFor="cashier_access">Kassaga kirish</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="admin_access" />
                  <Label htmlFor="admin_access">Admin panelga kirish</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="reports_access" />
                  <Label htmlFor="reports_access">Hisobotlarni ko'rish</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="employee_manage" />
                  <Label htmlFor="employee_manage">Xodimlarni boshqarish</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
              Bekor qilish
            </Button>
            <Button onClick={() => setShowAddRoleDialog(false)}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
