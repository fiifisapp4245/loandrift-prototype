import { describe, expect, it } from "vitest"
import nextConfig from "@/next.config"
import { LEGACY_QUEUE_ROUTES } from "@/lib/legacy-routes"
import { LOAN_STATUS } from "@/lib/format"
import { allDestinations } from "@/lib/nav"

describe("old Loan Features links", () => {
  it("redirect every one of the nine queues to All Loans with the same status", async () => {
    const redirects = await nextConfig.redirects!()
    expect(redirects).toHaveLength(9)
    for (const r of LEGACY_QUEUE_ROUTES) {
      expect(r.status in LOAN_STATUS).toBe(true)
      expect(redirects).toContainEqual({ source: r.path, destination: `/loans?status=${r.status}`, permanent: false })
    }
  })

  it("are no longer sidebar destinations", () => {
    const hrefs = allDestinations().map((d) => d.href)
    for (const r of LEGACY_QUEUE_ROUTES) expect(hrefs).not.toContain(r.path)
  })
})
