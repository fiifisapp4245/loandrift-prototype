import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { ContactForm } from "@/components/marketing/contact-form"
import { LoanDriftLanding } from "@/components/marketing/landing"
import { TooltipProvider } from "@/components/ui/tooltip"
import { FEATURES, PLANS } from "@/lib/marketing-content"
import { mockSearch } from "@/test/setup-dom"

const landing = (release = false) =>
  render(
    <TooltipProvider>
      <LoanDriftLanding release={release} />
    </TooltipProvider>,
  )

describe("LoanDrift landing", () => {
  it("has one H1, says LoanDrift doesn't lend, and links the demo with its intent", () => {
    landing()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByText("LoanDrift is software for lenders. It doesn’t provide loans.")).toBeTruthy()
    for (const link of screen.getAllByRole("link", { name: /^Book a demo/ })) {
      expect(link.getAttribute("href")).toMatch(/^\/contact\?product=loandrift&intent=demo/)
    }
  })

  it("plan cards and the comparison table come from one dataset, so they agree", () => {
    landing()
    const table = screen.getByRole("table", { name: "LoanDrift plan comparison" })
    for (const f of FEATURES) {
      const row = within(table).getByRole("rowheader", { name: new RegExp(`^${f.label}`) }).parentElement!
      const cells = within(row).getAllByRole("cell")
      PLANS.forEach((p, i) => {
        const expected = { included: "Included", "not-included": "Not included", tbc: "To confirm" }[f.plans[p.id]]
        expect(cells[i]!.textContent).toBe(expected)
      })
    }
    // The audit's contradiction is surfaced, not resolved by guesswork.
    expect(screen.getByText(/Basic plan card lists online card payments/)).toBeTruthy()
  })

  it("never shows a price, statistic or testimonial", () => {
    const { container } = landing()
    expect(container.textContent).not.toMatch(/GH₵\s?\d[\d,]*(\.\d+)?\s*(\/|per)\s*(month|year)/i)
    expect(container.textContent).not.toMatch(/\d+% (faster|more|less)|trusted by \d+/i)
    expect(screen.getByText(/No customer logos, quotes or statistics are shown/)).toBeTruthy()
  })

  it("holds unsubstantiated AI and POS claims for review", () => {
    landing()
    expect(screen.getByText("Real-time AI credit scoring.")).toBeTruthy()
    expect(screen.queryByRole("heading", { name: /AI/ })).toBeNull()
  })

  it("the release preview hides everything still under review", () => {
    const { container } = landing(true)
    expect(container.textContent).not.toMatch(/To confirm|Held|Online repayments|AI credit scoring/)
    expect(container.querySelector("#proof")).toBeNull()
    expect(screen.getAllByText("Contact us for pricing")).toHaveLength(2)
    expect(screen.queryByRole("link", { name: "Proof" })).toBeNull()
  })

  it("uses accessible disclosures for FAQs", async () => {
    landing()
    const q = screen.getByText("Does LoanDrift lend money?")
    const details = q.closest("details")!
    expect(details.open).toBe(false)
    await userEvent.click(q)
    expect(details.open).toBe(true)
  })
})

describe("Book a demo form", () => {
  it("keeps the product, demo intent and plan from the link", () => {
    mockSearch.current = new URLSearchParams("product=loandrift&intent=demo&plan=advance")
    const { container } = render(<ContactForm />)
    const summary = [...container.querySelectorAll("p")].find((p) => p.textContent?.startsWith("You’re asking about"))!
    expect(summary.textContent).toContain("LoanDrift")
    expect(summary.textContent).toContain("Book a demo")
    expect(summary.textContent).toContain("Advance plan")
    expect((screen.getByLabelText(/^What would you like\?/) as HTMLSelectElement).value).toBe("demo")
    expect(screen.getByText("Nothing is booked until you confirm.")).toBeTruthy()
  })

  it("validates with associated errors and sends nothing", async () => {
    mockSearch.current = new URLSearchParams("product=loandrift&intent=demo")
    render(<ContactForm />)
    await userEvent.click(screen.getByRole("button", { name: "Request a demo" }))
    const summary = await screen.findByRole("alert")
    expect(summary.textContent).toContain("Enter your work email so we can reply.")
    expect(screen.getByLabelText(/Work email/).getAttribute("aria-invalid")).toBe("true")
    // The summary takes focus on the next frame; type only after that, or keystrokes race it.
    await waitFor(() => expect(document.activeElement).toBe(summary))

    await userEvent.type(screen.getByLabelText(/Your name/), "Test Person")
    await userEvent.type(screen.getByLabelText(/Work email/), "test@example.com")
    await userEvent.type(screen.getByLabelText(/Organisation/), "Example Lenders")
    await userEvent.click(screen.getByRole("button", { name: "Request a demo" }))
    await waitFor(() => expect(screen.getByRole("heading", { name: "Request checked, not sent" })).toBeTruthy(), { timeout: 3000 })
    expect(screen.getByRole("status").textContent).toContain("book a demo of LoanDrift")
  })
})
