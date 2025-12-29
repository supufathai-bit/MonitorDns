import './globals.css'
import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Sentinel DNS Monitor',
  description: 'Real-time DNS Monitoring Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-200 antialiased">
        {children}
      </body>
    </html>
  )
}