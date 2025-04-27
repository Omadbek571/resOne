"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

// Demo foydalanuvchilar
const demoUsers = [
  { pin: "1234", name: "Alisher Karimov", role: "waiter" },
  { pin: "5678", name: "Dilshod Rahimov", role: "chef" },
  { pin: "9012", name: "Nodira Azizova", role: "cashier" },
  { pin: "3456", name: "Jahongir Umarov", role: "admin" },
  { pin: "7890", name: "Sardor Mahmudov", role: "delivery" },
]

export default function AuthPage() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fixed numbers for PIN pad (0-9)
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

  const handleNumberClick = (num: number) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num)
    }
  }

  const handleClear = () => {
    setPin("")
    setError("")
  }

  const handleLogin = async () => {
    setIsLoading(true)
    setError("")

    try {
      // API chaqiruvni o'rniga demo foydalanuvchilarni tekshirish
      const user = demoUsers.find((user) => user.pin === pin)

      if (user) {
        // Demo token yaratish
        const demoToken = "demo_token_" + Math.random().toString(36).substring(2, 15)
        const demoRefresh = "demo_refresh_" + Math.random().toString(36).substring(2, 15)

        // Tokenni localStorage ga saqlash
        localStorage.setItem("token", demoToken)
        localStorage.setItem("refresh", demoRefresh)

        // User ma'lumotlarini localStorage ga saqlash
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: user.name,
            role: user.role,
          }),
        )

        // Rolega qarab yo'naltirish
        switch (user.role) {
          case "waiter":
            router.replace("/pos")
            break
          case "chef":
            router.replace("/kitchen")
            break
          case "cashier":
            router.replace("/cashier")
            break
          case "admin":
            router.replace("/admin")
            break
          case "delivery":
            router.replace("/delivery")
            break
          default:
            setError("Noma'lum foydalanuvchi roli")
        }
      } else {
        setError("Noto'g'ri PIN-kod")
      }
    } catch (err) {
      console.error("Login xatolik:", err)
      setError("Tizimga kirishda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">SmartResto</CardTitle>
          <CardDescription>Tizimga kirish uchun PIN-kodni kiriting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 rounded-md border p-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Xodim</Label>
              <p className="font-medium">Afitsiant</p>
            </div>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="relative">
            <Input
              type="password"
              value={pin}
              readOnly
              className="text-center text-2xl tracking-widest h-14"
              maxLength={4}
              placeholder="****"
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* First row: 1, 2, 3 */}
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(1)}>
              1
            </Button>
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(2)}>
              2
            </Button>
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(3)}>
              3
            </Button>

            {/* Second row: 4, 5, 6 */}
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(4)}>
              4
            </Button>
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(5)}>
              5
            </Button>
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(6)}>
              6
            </Button>

            {/* Third row: 7, 8, 9 */}
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(7)}>
              7
            </Button>
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(8)}>
              8
            </Button>
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(9)}>
              9
            </Button>

            {/* Fourth row: Clear, 0, Login */}
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={handleClear}>
              Tozalash
            </Button>
            <Button variant="outline" className="h-14 text-xl font-semibold" onClick={() => handleNumberClick(0)}>
              0
            </Button>
            <Button
              variant="default"
              className="h-14 text-xl font-semibold bg-primary w-full"
              onClick={handleLogin}
              disabled={pin.length !== 4 || isLoading}
            >
              {isLoading ? "Kirish..." : "Kirish"}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            Agar PIN-kodni unutgan bo'lsangiz, administrator bilan bog'laning
          </p>

          {/* Sample PIN codes for testing */}
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-center font-medium mb-1">Namuna PIN kodlar (test uchun):</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="border rounded p-1">
                <p className="font-medium">Afitsiant</p>
                <p className="text-primary">1234</p>
              </div>
              <div className="border rounded p-1">
                <p className="font-medium">Oshpaz</p>
                <p className="text-primary">5678</p>
              </div>
              <div className="border rounded p-1">
                <p className="font-medium">Kassir</p>
                <p className="text-primary">9012</p>
              </div>
              <div className="border rounded p-1">
                <p className="font-medium">Administrator</p>
                <p className="text-primary">3456</p>
              </div>
              <div className="border rounded p-1">
                <p className="font-medium">Yetkazuvchi</p>
                <p className="text-primary">7890</p>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
