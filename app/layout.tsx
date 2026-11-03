import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })
const mono = Geist_Mono({ variable: "--font-mono-ref", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "LoanDrift", template: "%s · LoanDrift" },
  description: "Lending operations for TroveSuite: applications, approvals, repayments and collections.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${mono.variable}`}>
      <body className="antialiased">
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
