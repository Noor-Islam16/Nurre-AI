const cryptoSource =
  (typeof globalThis !== 'undefined' && (globalThis as any).crypto) || undefined

function randomByte() {
  if (cryptoSource?.getRandomValues) {
    const arr = new Uint8Array(1)
    cryptoSource.getRandomValues(arr)
    return arr[0]
  }
  return Math.floor(Math.random() * 256)
}

function safeRandomUUID() {
  if (cryptoSource?.randomUUID) {
    return cryptoSource.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = randomByte() & 0xf
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function generateVoiceSessionIdentifiers(prefix: string) {
  const labelSuffix = Math.random().toString(36).slice(2, 10)
  return {
    id: safeRandomUUID(),
    label: `${prefix}-${Date.now()}-${labelSuffix}`
  }
}

