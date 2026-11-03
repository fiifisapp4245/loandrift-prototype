import type { Metadata } from "next"
import { Suspense } from "react"
import { ContactForm } from "@/components/marketing/contact-form"

export const metadata: Metadata = { title: { absolute: "Contact TroveSuite" } }

export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 md:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Talk to the TroveSuite team</h1>
        <p className="mt-2 text-muted-foreground">Tell us a little about your organisation and what you&rsquo;d like to see.</p>
      </div>
      <Suspense>
        <ContactForm />
      </Suspense>
    </div>
  )
}
