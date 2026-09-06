import { createHash, randomUUID } from 'node:crypto'

export const MAX_RECEIPT_IMAGE_BYTES = 10 * 1024 * 1024

export type ValidatedReceiptImage = {
  bytes: Uint8Array
  mimeType: 'image/jpeg' | 'image/png'
  extension: 'jpg' | 'png'
  sha256: string
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value)
}

export function validateReceiptImage(
  bytes: Uint8Array,
  declaredMimeType: string | null,
): ValidatedReceiptImage {
  if (bytes.byteLength < 8 || bytes.byteLength > MAX_RECEIPT_IMAGE_BYTES) {
    throw new Error('receipt_image_size_invalid')
  }

  let detected: Pick<ValidatedReceiptImage, 'mimeType' | 'extension'> | null = null
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    detected = { mimeType: 'image/jpeg', extension: 'jpg' }
  } else if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    detected = { mimeType: 'image/png', extension: 'png' }
  }

  if (!detected) throw new Error('receipt_image_magic_bytes_invalid')
  if (declaredMimeType && declaredMimeType.toLowerCase() !== detected.mimeType) {
    throw new Error('receipt_image_mime_mismatch')
  }

  return {
    bytes,
    ...detected,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

export function buildReceiptStoragePath(
  schoolId: string,
  submissionId: string,
  extension: 'jpg' | 'png',
): string {
  return `${schoolId}/${submissionId}/${randomUUID()}.${extension}`
}

type MetaMediaMetadata = {
  id?: string
  url?: string
  mime_type?: string
  file_size?: number
  error?: { code?: number }
}

export async function downloadMetaReceiptImage(input: {
  mediaId: string
  accessToken: string
  graphApiVersion: string
  fetchImplementation?: typeof fetch
}): Promise<ValidatedReceiptImage> {
  const fetchImplementation = input.fetchImplementation ?? globalThis.fetch
  const headers = { authorization: `Bearer ${input.accessToken}` }
  const metadataResponse = await fetchImplementation(
    `https://graph.facebook.com/${input.graphApiVersion}/${encodeURIComponent(input.mediaId)}`,
    { headers },
  )
  const metadata = await metadataResponse.json().catch(() => null) as MetaMediaMetadata | null
  if (!metadataResponse.ok || metadata?.id !== input.mediaId || !metadata.url) {
    const code = metadata?.error?.code ? String(metadata.error.code) : String(metadataResponse.status)
    throw new Error(`whatsapp_media_metadata_failed:${code}`)
  }
  if (metadata.file_size && metadata.file_size > MAX_RECEIPT_IMAGE_BYTES) {
    throw new Error('receipt_image_size_invalid')
  }

  const mediaResponse = await fetchImplementation(metadata.url, { headers, redirect: 'error' })
  if (!mediaResponse.ok) throw new Error(`whatsapp_media_download_failed:${mediaResponse.status}`)
  const contentLength = Number(mediaResponse.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_RECEIPT_IMAGE_BYTES) {
    throw new Error('receipt_image_size_invalid')
  }

  const bytes = new Uint8Array(await mediaResponse.arrayBuffer())
  return validateReceiptImage(bytes, metadata.mime_type ?? mediaResponse.headers.get('content-type'))
}
