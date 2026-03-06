import { randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"

import { hashClaimCode } from "@/lib/hash"

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 8
const CODE_GROUP_SIZE = 4
const MAX_GENERATION_ATTEMPTS = 5
const EXPIRY_DAYS = 7
const MS_IN_DAY = 86_400_000

export type ClaimCodeEventType = "claim_code_generated" | "claim_code_regenerated"

export function getMaxAllowedUses(): number {
  const raw = Number(process.env.MAX_PROFESSIONALS_PER_USER ?? 3)
  if (!Number.isFinite(raw) || raw <= 0) {
    return 3
  }
  return Math.max(1, Math.min(10, Math.floor(raw)))
}

export function sanitizeAllowedUses(requested: unknown): number {
  const max = getMaxAllowedUses()
  const value = typeof requested === "number" ? requested : Number(requested)
  if (!Number.isFinite(value) || value <= 0) {
    return max
  }
  return Math.min(max, Math.max(1, Math.floor(value)))
}

function generateClaimCode(): string {
  const bytes = randomBytes(CODE_LENGTH)
  let raw = ""
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const index = bytes[i] % CODE_ALPHABET.length
    raw += CODE_ALPHABET[index]
  }

  const first = raw.slice(0, CODE_GROUP_SIZE)
  const second = raw.slice(CODE_GROUP_SIZE, CODE_LENGTH)
  return `${first}-${second}`
}

async function invalidateActiveCodes(supabase: SupabaseClient, userId: string, timestamp: string) {
  const { error } = await supabase
    .from("claim_codes")
    .update({ invalidated_at: timestamp })
    .eq("user_id", userId)
    .is("invalidated_at", null)
    .is("consumed_at", null)

  if (error) {
    throw new Error(`Failed to invalidate prior claim codes: ${error.message}`)
  }
}

async function insertClaimCode(
  supabase: SupabaseClient,
  userId: string,
  hashed: string,
  expiresAt: string,
  allowedUses: number,
) {
  const { error } = await supabase
    .from("claim_codes")
    .insert({
      user_id: userId,
      code_hash: hashed,
      expires_at: expiresAt,
      allowed_uses: allowedUses,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }
}

async function updateUserMetadata(supabase: SupabaseClient, userId: string, timestamp: string) {
  const { error } = await supabase
    .from("users")
    .update({ last_claim_code_at: timestamp })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to update user metadata: ${error.message}`)
  }
}

async function logClaimCodeEvent(
  supabase: SupabaseClient,
  userId: string,
  eventType: ClaimCodeEventType,
  allowedUses: number,
) {
  const { error } = await supabase.from("events").insert({
    user_id: userId,
    type: eventType,
    data: { allowedUses },
  })

  if (error) {
    throw new Error(`Failed to log claim code event: ${error.message}`)
  }
}

export async function issueClaimCode(
  supabase: SupabaseClient,
  userId: string,
  allowedUses: number,
  eventType: ClaimCodeEventType,
): Promise<{ code: string; expiresAt: string }> {
  const timestamp = new Date().toISOString()
  await invalidateActiveCodes(supabase, userId, timestamp)

  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * MS_IN_DAY).toISOString()

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const code = generateClaimCode()
    const hashed = hashClaimCode(code)

    try {
      await insertClaimCode(supabase, userId, hashed, expiresAt, allowedUses)
      await updateUserMetadata(supabase, userId, timestamp)
      await logClaimCodeEvent(supabase, userId, eventType, allowedUses)
      return { code, expiresAt }
    } catch (error: any) {
      if (error?.code === "23505") {
        lastError = error
        continue
      }
      throw error
    }
  }

  throw new Error(`Failed to generate unique claim code: ${lastError?.message ?? "unknown error"}`)
}
