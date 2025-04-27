"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Home, Bell, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState("")

  useEffect(() => {
    // Foydalanuvchi ma'lumotlarini localStorage dan olish
    const user = JSON.parse(localStorage.getItem("user") || "{}")
    setUserName(user.name || "")
    setUserRole(user.role || "")
  }, [])

  const handleHomeClick = () => {
    // Rolega qarab yo'naltirish
    switch (userRole) {
      case "waiter":
        router.push("/pos")
        break
      case "chef":
        router.push("/kitchen")
        break
      case "cashier":
        router.push("/cashier")
        break
      case "admin":
        router.push("/admin")
        break
      case "delivery":
        router.push("/delivery")
        break
      default:
        router.push("/auth")
    }
  }

  const handleLogout = () => {
    // Token va foydalanuvchi ma'lumotlarini o'chirish
    localStorage.removeItem("token")
    localStorage.removeItem("refresh")
    localStorage.removeItem("user")
    // Login sahifasiga yo'naltirish
    router.push("/auth")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center px-4 gap-4">
          {/* Chap tomondagi elementlar */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleHomeClick} className="hover:bg-accent">
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">SmartResto POS</h1>
          </div>

          {/* O'rtadagi bo'sh joy */}
          <div className="flex-1" />

          {/* O'ng tomondagi elementlar */}
          <div className="flex items-center gap-4">
            {/* Bildirishnomalar */}
            <Button variant="ghost" size="icon" className="hover:bg-accent">
              <Bell className="h-5 w-5" />
            </Button>

            {/* Foydalanuvchi ma'lumotlari */}
            <div className="flex items-center gap-2 border rounded-full px-3 py-1">
              <User className="h-5 w-5" />
              <span className="text-sm font-medium">{userName}</span>
            </div>

            {/* Chiqish tugmasi */}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:bg-accent">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Asosiy kontent */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
