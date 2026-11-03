import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { InfoTip } from "@/components/patterns/info-tip"
import { TooltipProvider } from "@/components/ui/tooltip"

describe("InfoTip", () => {
  it("opens on tap or click, not only hover, and closes on Escape", async () => {
    render(
      <TooltipProvider>
        <InfoTip label="Arrears">Unpaid amounts due before today.</InfoTip>
      </TooltipProvider>,
    )
    const button = screen.getByRole("button", { name: "About Arrears" })
    expect(screen.queryByRole("tooltip")).toBeNull()
    await userEvent.click(button)
    expect((await screen.findByRole("tooltip")).textContent).toContain("Unpaid amounts due before today.")
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  it("opens on keyboard focus", async () => {
    render(
      <TooltipProvider>
        <InfoTip label="PAR 30">Portfolio at risk.</InfoTip>
      </TooltipProvider>,
    )
    await userEvent.tab()
    expect((await screen.findByRole("tooltip")).textContent).toContain("Portfolio at risk.")
  })
})
