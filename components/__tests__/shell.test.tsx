import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { allDestinations } from "@/lib/nav"
import { mockPathname } from "@/test/setup-dom"

function renderShell(path: string) {
  mockPathname.current = path
  return render(
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarTrigger />
      </SidebarProvider>
    </TooltipProvider>,
  )
}

describe("AppSidebar", () => {
  it("links every destination", async () => {
    renderShell("/loans")
    const nav = screen.getByRole("navigation", { name: "Main" })
    for (const d of allDestinations()) {
      expect(within(nav).getByRole("link", { name: d.label }).getAttribute("href"), d.href).toBe(d.href)
    }
  })

  it("has no separate Loan Features group: statuses live in All Loans (F44)", () => {
    renderShell("/loans")
    expect(screen.queryByText("Loan Features")).toBeNull()
    expect(screen.queryByRole("link", { name: "Captured" })).toBeNull()
  })

  it("marks the current page", () => {
    renderShell("/loans")
    expect(screen.getByRole("link", { name: "All Loans" }).getAttribute("aria-current")).toBe("page")
  })

  it("uses Active, not Activated", () => {
    renderShell("/dashboard")
    expect(screen.queryByText("Activated")).toBeNull()
  })

  it("names the collapse control by what it will do", async () => {
    renderShell("/dashboard")
    const trigger = screen.getByRole("button", { name: "Collapse navigation" })
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    await userEvent.click(trigger)
    expect((screen.getByRole("button", { name: "Expand navigation" })).getAttribute("aria-expanded")).toBe("false")
  })

  it("keeps every destination named in the icon-only sidebar", async () => {
    renderShell("/dashboard")
    await userEvent.click(screen.getByRole("button", { name: "Collapse navigation" }))
    const nav = screen.getByRole("navigation", { name: "Main" })
    expect(within(nav).getByRole("link", { name: "LoanDrift by TroveSuite" })).toBeTruthy()
    expect(within(nav).getByRole("link", { name: "All Loans" })).toBeTruthy()
  })
})
