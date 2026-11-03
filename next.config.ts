import type { NextConfig } from "next"
import { LEGACY_QUEUE_ROUTES } from "./lib/legacy-routes"

const nextConfig: NextConfig = {
  // Old Loan Features queue links land on All Loans with the same status filter.
  async redirects() {
    return LEGACY_QUEUE_ROUTES.map((r) => ({ source: r.path, destination: `/loans?status=${r.status}`, permanent: false }))
  },
}

export default nextConfig
