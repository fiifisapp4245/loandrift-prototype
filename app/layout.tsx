import type { Metadata } from "next"
import { Geist_Mono, IBM_Plex_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

// IBM Plex Sans isn't a variable font, so each weight the app uses is loaded explicitly.
const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const mono = Geist_Mono({ variable: "--font-mono-ref", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "LoanDrift", template: "%s · LoanDrift" },
  description: "Lending operations for TroveSuite: applications, approvals, repayments and collections.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${plex.variable} ${mono.variable}`}>
      <body className="antialiased">
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
