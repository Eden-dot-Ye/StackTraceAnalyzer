import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Stack Trace Analyzer - Git Blame Insights",
  description:
    "Analyze stack traces and automatically identify code changes with Git Blame. Find PR links, authors, and modification dates quickly.",
  keywords: ["stack trace", "git blame", "code analysis", "debugging"],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  generator: "Eden",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
