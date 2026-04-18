import type { RuntimeMediaAsset, StoredMediaAssetRecord } from '../types'

function guessVideoExtension(filename: string) {
  return /\.(mov|mp4|webm|m4v)$/i.test(filename)
}

function loadImageMetadata(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error('This image file could not be opened in the browser.'))
    image.src = objectUrl
  })
}

function loadVideoMetadata(objectUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const timeoutId = window.setTimeout(() => {
      video.src = ''
      reject(new Error('This video format could not be decoded by the browser.'))
    }, 7000)

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.onloadedmetadata = () => {
      window.clearTimeout(timeoutId)
      resolve({ width: video.videoWidth, height: video.videoHeight })
      video.src = ''
    }
    video.onerror = () => {
      window.clearTimeout(timeoutId)
      reject(new Error('This video format could not be decoded by the browser.'))
      video.src = ''
    }
    video.src = objectUrl
  })
}

export async function importMediaFile(file: File): Promise<RuntimeMediaAsset> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const kind = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/') || guessVideoExtension(file.name)
        ? 'video'
        : null

    if (!kind) {
      throw new Error('Only image files and browser-playable videos are supported in this version.')
    }

    const metadata =
      kind === 'image' ? await loadImageMetadata(objectUrl) : await loadVideoMetadata(objectUrl)

    return {
      id: crypto.randomUUID(),
      filename: file.name,
      mimeType: file.type || (kind === 'video' ? 'video/quicktime' : 'image/png'),
      kind,
      width: metadata.width,
      height: metadata.height,
      blob: file,
      objectUrl,
      validationStatus: 'ready',
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

export function hydrateMediaRecords(records: StoredMediaAssetRecord[]): RuntimeMediaAsset[] {
  return records.map((record) => ({
    ...record,
    objectUrl: URL.createObjectURL(record.blob),
  }))
}

export function releaseMediaAssets(mediaAssets: RuntimeMediaAsset[]) {
  mediaAssets.forEach((mediaAsset) => {
    URL.revokeObjectURL(mediaAsset.objectUrl)
  })
}
