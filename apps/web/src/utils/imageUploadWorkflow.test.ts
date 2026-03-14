import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createIdleUploadStatus,
  createUploadStatus,
  preparePendingImages,
  removeUploadProgressEntry,
  type PendingUploadImage,
} from '@/utils/imageUploadWorkflow'

function buildFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('imageUploadWorkflow', () => {
  const createObjectUrl = vi.fn(() => 'blob:preview')
  const revokeObjectUrl = vi.fn()

  beforeEach(() => {
    createObjectUrl.mockClear()
    revokeObjectUrl.mockClear()
    vi.stubGlobal('URL', {
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    })
  })

  it('creates predictable idle and error statuses', () => {
    expect(createIdleUploadStatus()).toEqual({
      state: 'idle',
      message: '',
      details: [],
      canRetry: false,
    })

    expect(createUploadStatus('error', 'Upload failed', ['Network timeout'], true)).toEqual({
      state: 'error',
      message: 'Upload failed',
      details: ['Network timeout'],
      canRetry: true,
    })
  })

  it('rejects unsupported files before queueing them', async () => {
    const result = await preparePendingImages([buildFile('chart.gif', 'image/gif', 1024)], {
      entityLabel: 'trade',
      currentCount: 0,
      currentTotalBytes: 0,
      maxFiles: 5,
      maxFileBytes: 5 * 1024 * 1024,
      maxTotalBytes: 20 * 1024 * 1024,
      compressFile: async (file) => file,
      buildPendingImage: ({ file, previewUrl, index }): PendingUploadImage => ({
        id: `pending-${index}`,
        file,
        preview_url: previewUrl,
        context_tag: 'entry',
        timeframe: '',
        annotation_notes: '',
      }),
    })

    expect(result.accepted).toHaveLength(0)
    expect(result.errors).toContain('Only jpg, jpeg, png, webp, and bmp files are allowed.')
    expect(createObjectUrl).not.toHaveBeenCalled()
  })

  it('keeps valid files and reports extra ignored selections', async () => {
    const result = await preparePendingImages([
      buildFile('chart-1.jpg', 'image/jpeg', 1024),
      buildFile('chart-2.jpg', 'image/jpeg', 1024),
    ], {
      entityLabel: 'trade',
      currentCount: 4,
      currentTotalBytes: 0,
      maxFiles: 5,
      maxFileBytes: 5 * 1024 * 1024,
      maxTotalBytes: 20 * 1024 * 1024,
      compressFile: async (file) => file,
      buildPendingImage: ({ file, previewUrl, index }): PendingUploadImage => ({
        id: `pending-${index}`,
        file,
        preview_url: previewUrl,
        context_tag: 'entry',
        timeframe: '',
        annotation_notes: '',
      }),
    })

    expect(result.accepted).toHaveLength(1)
    expect(result.errors).toContain('Only 1 more image can be added right now.')
  })

  it('revokes previews when total quota would be exceeded', async () => {
    const result = await preparePendingImages([buildFile('chart-1.jpg', 'image/jpeg', 4 * 1024 * 1024)], {
      entityLabel: 'missed trade',
      currentCount: 0,
      currentTotalBytes: 17 * 1024 * 1024,
      maxFiles: 5,
      maxFileBytes: 5 * 1024 * 1024,
      maxTotalBytes: 20 * 1024 * 1024,
      compressFile: async (file) => file,
      buildPendingImage: ({ file, previewUrl, index }): PendingUploadImage => ({
        id: `pending-${index}`,
        file,
        preview_url: previewUrl,
        context_tag: 'entry',
        timeframe: '',
        annotation_notes: '',
      }),
    })

    expect(result.accepted).toHaveLength(0)
    expect(result.errors).toContain('Total image uploads per missed trade cannot exceed 20MB.')
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview')
  })

  it('removes progress entries without mutating unrelated uploads', () => {
    expect(removeUploadProgressEntry({
      one: 10,
      two: 55,
    }, 'one')).toEqual({
      two: 55,
    })
  })
})
