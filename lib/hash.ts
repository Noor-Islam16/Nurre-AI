import { createHash } from "crypto"

/**
 * Hash a claim code using a server-side pepper to avoid storing raw codes.
 * Assumes this runs on the server (Node runtime).
 */
export function hashClaimCode(raw: string): string {
  if (!raw) {
    throw new Error("hashClaimCode requires a non-empty string input")
  }

  const pepper = process.env.HASH_PEPPER
  if (!pepper) {
    throw new Error("HASH_PEPPER environment variable is not set")
  }

  return createHash("sha256").update(`${pepper}${raw}`).digest("hex")
}
