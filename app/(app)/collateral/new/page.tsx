import type { Metadata } from "next"
import { RegisterAssetForm } from "@/components/collateral/register-asset-form"

export const metadata: Metadata = { title: "Register an asset" }

export default function RegisterAssetPage() {
  return <RegisterAssetForm />
}
