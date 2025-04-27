"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import axios from "axios"



export default function AuthPage() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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

  function handleLogin() {
    setIsLoading(true)
    axios
      .post(
        "https://oshxonacopy.pythonanywhere.com/api/auth/login/",
        {
          pin_code: pin,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      .then((res) => {
        if (res.status === 200) {
          localStorage.setItem(
            "user",
            JSON.stringify({
              name: res.data.user.first_name,
              role: res.data.user.role.name,
            }),
          )

          localStorage.setItem("token", res.data.access)
          if (res.data.refresh) {
            localStorage.setItem("refresh", res.data.refresh)
          }

          const role = res.data.user.role.name
          if (role === "waiter") {
            router.push("/pos")
          } else if (role === "chef") {
            router.push("/kitchen")
          } else if (role === "cashier") {
            router.push("/cashier")
          } else if (role === "Administrator") {
            router.push("/admin")
          } else if (role === "delivery") {
            router.push("/delivery")
          } else {
            setError("Noma'lum rol: " + role)
          }
        } else {
          setError("Tizimga kirishda xatolik yuz berdi")
        }
      })
      .catch((err) => {
        console.log(err)
        setError("Noto'g'ri PIN-kod yoki server xatosi")
      })
      .finally(() => {
        setIsLoading(false)
      })
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
                <p className="text-primary">2006</p>
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
