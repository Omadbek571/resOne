import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import ClientProvider from "./client-provider"

export const metadata: Metadata = {
  title: "Omadbek Project",
  description: "Created by Omadbek and Shohjaxon",
  generator: "Omadbek",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  )
}

import "./globals.css"
