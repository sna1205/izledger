import type { ImageContextTag } from '@/types/trade'

export type ImageUploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error'

export interface ImageUploadStatus {
  state: ImageUploadState
  message: string
  details: string[]
  canRetry: boolean
}

export interface PendingUploadImage {
  id: string
  file: File
  preview_url: string
  context_tag: ImageContextTag
  timeframe: string
  annotation_notes: string
}

export interface PreparePendingImagesOptions<TPendingImage extends PendingUploadImage> {
  entityLabel: string
  currentCount: number
  currentTotalBytes: number
  maxFiles: number
  maxFileBytes: number
  maxTotalBytes: number
  allowedTypes?: Set<string>
  compressFile?: (file: File) => Promise<File>
  buildPendingImage: (input: {
    file: File
    previewUrl: string
    index: number
  }) => TPendingImage
}

export interface PreparePendingImagesResult<TPendingImage extends PendingUploadImage> {
  accepted: TPendingImage[]
  errors: string[]
}

export const DEFAULT_ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
])

export function createIdleUploadStatus(): ImageUploadStatus {
  return {
    state: 'idle',
    message: '',
    details: [],
    canRetry: false,
  }
}

export function createUploadStatus(
  state: ImageUploadState,
  message = '',
  details: string[] = [],
  canRetry = false
): ImageUploadStatus {
  return {
    state,
    message,
    details,
    canRetry,
  }
}

export async function preparePendingImages<TPendingImage extends PendingUploadImage>(
  files: File[],
  options: PreparePendingImagesOptions<TPendingImage>
): Promise<PreparePendingImagesResult<TPendingImage>> {
  if (files.length === 0) {
    return {
      accepted: [],
      errors: [],
    }
  }

  const errors: string[] = []
  const availableSlots = options.maxFiles - options.currentCount
  if (availableSlots <= 0) {
    return {
      accepted: [],
      errors: [`Maximum ${options.maxFiles} images per ${options.entityLabel} allowed.`],
    }
  }

  if (files.length > availableSlots) {
    errors.push(`Only ${availableSlots} more image${availableSlots === 1 ? '' : 's'} can be added right now.`)
  }

  const selected = files.slice(0, availableSlots)
  const accepted: TPendingImage[] = []
  const compressFile = options.compressFile ?? compressImageFile
  const allowedTypes = options.allowedTypes ?? DEFAULT_ALLOWED_IMAGE_TYPES

  for (const [index, file] of selected.entries()) {
    if (!allowedTypes.has(file.type)) {
      errors.push('Only jpg, jpeg, png, webp, and bmp files are allowed.')
      continue
    }

    if (file.size > options.maxFileBytes) {
      errors.push('Each image must be 5MB or smaller.')
      continue
    }

    const compressed = await compressFile(file)
    if (compressed.size > options.maxFileBytes) {
      errors.push('Compressed image still exceeds 5MB. Use a smaller image.')
      continue
    }

    const previewUrl = URL.createObjectURL(compressed)
    accepted.push(options.buildPendingImage({
      file: compressed,
      previewUrl,
      index,
    }))
  }

  if (accepted.length === 0) {
    return {
      accepted: [],
      errors,
    }
  }

  const acceptedBytes = accepted.reduce((sum, image) => sum + image.file.size, 0)
  if ((options.currentTotalBytes + acceptedBytes) > options.maxTotalBytes) {
    for (const image of accepted) {
      URL.revokeObjectURL(image.preview_url)
    }

    return {
      accepted: [],
      errors: [...errors, `Total image uploads per ${options.entityLabel} cannot exceed 20MB.`],
    }
  }

  return {
    accepted,
    errors,
  }
}

export function revokePendingImagePreview(image: Pick<PendingUploadImage, 'preview_url'>): void {
  URL.revokeObjectURL(image.preview_url)
}

export function removeUploadProgressEntry(
  progressByPendingId: Record<string, number>,
  pendingImageId: string
): Record<string, number> {
  const next = { ...progressByPendingId }
  delete next[pendingImageId]
  return next
}

export async function compressImageFile(file: File): Promise<File> {
  try {
    const image = await loadImage(file)
    const maxDimension = 1920
    const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const targetWidth = Math.max(1, Math.round(image.width * ratio))
    const targetHeight = Math.max(1, Math.round(image.height * ratio))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputType, 0.82)
    })

    if (!blob) return file
    if (blob.size >= file.size) return file

    const normalizedName = normalizeFileName(file.name, outputType)
    return new File([blob], normalizedName, {
      type: outputType,
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}

function normalizeFileName(name: string, mimeType: string): string {
  const base = name.replace(/\.[^/.]+$/, '')
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  return `${base}.${ext}`
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)

  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Unable to load image'))
    }
    image.src = url
  })
}
