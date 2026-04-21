import JSZip from 'jszip'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadProjectSnapshot } from './projectStorage'
import { loadVenueAssetManifest } from './venueAssets'

const builderVenueDefinitions = [
  { id: 'bar', label: 'Bar' },
  { id: 'entrance', label: 'Entrance' },
  { id: 'exit', label: 'South Wall' },
  { id: 'stage', label: 'Stage' },
] as const

type BuilderVenueId = (typeof builderVenueDefinitions)[number]['id']
type UploadSubmissionType = 'builder-asset' | 'builder-manifest' | 'builder' | 'zip-upload'
type SubmissionType = 'builder' | 'zip-upload'

type SignedUploadPayload = {
  bucket: string
  token: string
  path: string
}

type FinalizeSubmissionResponse = {
  submissionId: string | null
  emailSent: boolean
  warning?: string
}

type BuilderManifestMediaRecord = {
  id: string
  filename: string
  mimeType: string
  kind: 'image' | 'video'
  width: number
  height: number
  bytes: number
  storagePath: string
}

type BuilderManifestVenueRecord = {
  id: BuilderVenueId
  label: string
  project: unknown
  media: BuilderManifestMediaRecord[]
}

type BuilderManifest = {
  type: 'builder-submission-manifest'
  version: 1
  projectName: string
  createdAt: string
  includedVenues: string[]
  totalMediaCount: number
  totalUploadedBytes: number
  venues: BuilderManifestVenueRecord[]
}

type BuilderSubmissionPackage = {
  archiveFilename: string
  manifestBlob: Blob
  manifestFilename: string
  includedVenues: string[]
  fileSizeBytes: number
  metadata: Record<string, unknown>
}

type SubmitArchiveOptions = {
  blob: Blob
  filename: string
  projectName: string
  submissionType: SubmissionType
  includedVenues: string[]
  fileSizeBytes?: number
  metadata: Record<string, unknown>
}

let browserSupabaseClient: SupabaseClient | null = null

function getRequiredClientEnv(key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') {
  const value = import.meta.env[key]

  if (!value) {
    throw new Error(`Missing ${key}. Add it to your Vercel and local environment before submitting.`)
  }

  return value
}

function getBrowserSupabaseClient() {
  if (!browserSupabaseClient) {
    browserSupabaseClient = createClient(
      getRequiredClientEnv('VITE_SUPABASE_URL'),
      getRequiredClientEnv('VITE_SUPABASE_ANON_KEY'),
    )
  }

  return browserSupabaseClient
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createTimestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function getFileExtension(filename: string) {
  const match = filename.match(/(\.[a-z0-9]+)$/i)
  return match?.[1] ?? ''
}

function createExportFilename(order: number, surfaceLabel: string, originalFilename: string) {
  const safeSurfaceLabel = sanitizeSegment(surfaceLabel) || 'surface'
  const extension = getFileExtension(originalFilename)
  return `${String(order).padStart(2, '0')}-${safeSurfaceLabel}${extension}`
}

async function requestSignedUpload(filename: string, submissionType: UploadSubmissionType) {
  const response = await fetch('/api/submissions/create-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename,
      submissionType,
    }),
  })

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<SignedUploadPayload>)
    | null

  if (!response.ok || !payload?.bucket || !payload.token || !payload.path) {
    throw new Error(payload?.error ?? 'Could not prepare the cloud upload.')
  }

  return payload as SignedUploadPayload
}

async function finalizeSubmission(
  payload: Omit<SubmitArchiveOptions, 'blob'> & { storagePath: string; fileSizeBytes: number },
) {
  const response = await fetch('/api/submissions/finalize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<FinalizeSubmissionResponse>)
    | null

  if (!response.ok) {
    throw new Error(data?.error ?? 'The submission could not be finalized.')
  }

  return {
    submissionId: data?.submissionId ?? null,
    emailSent: data?.emailSent ?? false,
    warning: data?.warning,
  } satisfies FinalizeSubmissionResponse
}

async function uploadToStorage(
  blob: Blob,
  filename: string,
  submissionType: UploadSubmissionType,
) {
  const signedUpload = await requestSignedUpload(filename, submissionType)
  const supabase = getBrowserSupabaseClient()
  const { error } = await supabase.storage
    .from(signedUpload.bucket)
    .uploadToSignedUrl(signedUpload.path, signedUpload.token, blob)

  if (error) {
    throw new Error(error.message || 'The file could not be uploaded to storage.')
  }

  return signedUpload.path
}

function formatVenueDraftId(venueId: BuilderVenueId) {
  return `__draft__::${venueId}`
}

async function createLocalBuilderZip(projectName: string) {
  const zip = new JSZip()
  const includedVenues: string[] = []
  const venueSummaries: Array<Record<string, unknown>> = []
  let totalMediaCount = 0

  for (const venue of builderVenueDefinitions) {
    const snapshot = await loadProjectSnapshot(formatVenueDraftId(venue.id))
    const manifest = await loadVenueAssetManifest(venue.id)

    if (!snapshot) {
      continue
    }

    const hasMedia = snapshot.mediaRecords.length > 0
    const hasAssignments = snapshot.project.layouts.some((layout) => layout.assignments.length > 0)

    if (!hasMedia && !hasAssignments) {
      continue
    }

    includedVenues.push(venue.label)

    const venueFolder = zip.folder(`venues/${sanitizeSegment(venue.label)}`)
    const placementFolder = venueFolder?.folder('placements')
    const unassignedFolder = venueFolder?.folder('unassigned-media')
    const activeLayout =
      snapshot.project.layouts.find((layout) => layout.id === snapshot.project.activeLayoutId) ??
      snapshot.project.layouts[0]
    const surfaceDefinitions = [...manifest.groupedSurfaces, ...manifest.surfaces]
    const surfaceById = new Map(surfaceDefinitions.map((surface) => [surface.id, surface]))
    const mediaById = new Map(snapshot.mediaRecords.map((mediaRecord) => [mediaRecord.id, mediaRecord]))
    const placedMediaIds = new Set<string>()
    const assignmentSummary: Array<Record<string, unknown>> = []

    if (!venueFolder) {
      continue
    }

    venueFolder.file('project.json', JSON.stringify(snapshot.project, null, 2))

    activeLayout?.assignments
      .slice()
      .sort((left, right) => {
        const leftOrder = surfaceById.get(left.surfaceId)?.tileOrder ?? 999
        const rightOrder = surfaceById.get(right.surfaceId)?.tileOrder ?? 999
        return leftOrder - rightOrder
      })
      .forEach((assignment, index) => {
        const surface = surfaceById.get(assignment.surfaceId)
        const mediaRecord = mediaById.get(assignment.mediaAssetId)

        if (!surface || !mediaRecord || !placementFolder) {
          return
        }

        totalMediaCount += 1
        placedMediaIds.add(mediaRecord.id)

        const exportFilename = createExportFilename(index + 1, surface.tileLabel, mediaRecord.filename)
        placementFolder.file(exportFilename, mediaRecord.blob)

        assignmentSummary.push({
          surfaceId: surface.id,
          surfaceLabel: surface.label,
          exportedFilename: exportFilename,
          originalFilename: mediaRecord.filename,
          kind: mediaRecord.kind,
        })
      })

    snapshot.mediaRecords
      .filter((mediaRecord) => !placedMediaIds.has(mediaRecord.id))
      .forEach((mediaRecord) => {
        if (!unassignedFolder) {
          return
        }

        totalMediaCount += 1
        const safeFilename = `${mediaRecord.id}-${sanitizeSegment(mediaRecord.filename) || 'asset'}`
        unassignedFolder.file(safeFilename, mediaRecord.blob)
      })

    venueFolder.file(
      'placements.json',
      JSON.stringify(
        {
          venue: venue.label,
          layoutId: activeLayout?.id ?? null,
          assignments: assignmentSummary,
          unassignedMedia: snapshot.mediaRecords
            .filter((mediaRecord) => !placedMediaIds.has(mediaRecord.id))
            .map((mediaRecord) => ({
              originalFilename: mediaRecord.filename,
              mediaId: mediaRecord.id,
              kind: mediaRecord.kind,
            })),
        },
        null,
        2,
      ),
    )

    venueSummaries.push({
      id: venue.id,
      label: venue.label,
      layoutCount: snapshot.project.layouts.length,
      mediaCount: snapshot.mediaRecords.length,
      exportedPlacementCount: assignmentSummary.length,
      assignmentCount: snapshot.project.layouts.reduce(
        (count, layout) => count + layout.assignments.length,
        0,
      ),
    })
  }

  if (totalMediaCount === 0) {
    throw new Error('Add at least one image or video before downloading the mapping package.')
  }

  zip.file(
    'submission.json',
    JSON.stringify(
      {
        type: 'builder-submission',
        projectName,
        createdAt: new Date().toISOString(),
        includedVenues,
        totalMediaCount,
        venues: venueSummaries,
      },
      null,
      2,
    ),
  )

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return {
    blob,
    filename: `${sanitizeSegment(projectName) || 'balcony-mockup'}-${createTimestampSlug()}.zip`,
    includedVenues,
    totalMediaCount,
  }
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000)
}

export async function createBuilderSubmissionArchive(
  projectName: string,
): Promise<BuilderSubmissionPackage> {
  const includedVenues: string[] = []
  const manifestVenues: BuilderManifestVenueRecord[] = []
  let totalMediaCount = 0
  let totalUploadedBytes = 0

  for (const venue of builderVenueDefinitions) {
    const snapshot = await loadProjectSnapshot(formatVenueDraftId(venue.id))

    if (!snapshot) {
      continue
    }

    const hasMedia = snapshot.mediaRecords.length > 0
    const hasAssignments = snapshot.project.layouts.some((layout) => layout.assignments.length > 0)

    if (!hasMedia && !hasAssignments) {
      continue
    }

    includedVenues.push(venue.label)

    const manifestMedia: BuilderManifestMediaRecord[] = []

    for (const mediaRecord of snapshot.mediaRecords) {
      totalMediaCount += 1
      totalUploadedBytes += mediaRecord.blob.size

      const safeFilename = `${mediaRecord.id}-${sanitizeSegment(mediaRecord.filename) || 'asset'}`
      const storagePath = await uploadToStorage(mediaRecord.blob, safeFilename, 'builder-asset')

      manifestMedia.push({
        id: mediaRecord.id,
        filename: mediaRecord.filename,
        mimeType: mediaRecord.mimeType,
        kind: mediaRecord.kind,
        width: mediaRecord.width,
        height: mediaRecord.height,
        bytes: mediaRecord.blob.size,
        storagePath,
      })
    }

    manifestVenues.push({
      id: venue.id,
      label: venue.label,
      project: snapshot.project,
      media: manifestMedia,
    })
  }

  if (totalMediaCount === 0) {
    throw new Error('Add at least one image or video before submitting the mapping package.')
  }

  const archiveFilename = `${sanitizeSegment(projectName) || 'balcony-mockup'}-${createTimestampSlug()}.zip`
  const manifestFilename = archiveFilename.replace(/\.zip$/i, '.json')
  const manifest: BuilderManifest = {
    type: 'builder-submission-manifest',
    version: 1,
    projectName,
    createdAt: new Date().toISOString(),
    includedVenues,
    totalMediaCount,
    totalUploadedBytes,
    venues: manifestVenues,
  }

  const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json',
  })

  return {
    archiveFilename,
    manifestBlob,
    manifestFilename,
    includedVenues,
    fileSizeBytes: totalUploadedBytes,
    metadata: {
      source: 'builder-manifest',
      manifestVersion: 1,
      totalMediaCount,
      totalUploadedBytes,
      venues: manifestVenues.map((venue) => ({
        id: venue.id,
        label: venue.label,
        mediaCount: venue.media.length,
        assignmentCount:
          (venue.project as { layouts?: Array<{ assignments?: unknown[] }> }).layouts?.reduce(
            (count, layout) => count + (layout.assignments?.length ?? 0),
            0,
          ) ?? 0,
      })),
    },
  }
}

export async function downloadBuilderProjectPackage(projectName: string) {
  const archive = await createLocalBuilderZip(projectName)
  triggerBrowserDownload(archive.blob, archive.filename)

  return {
    filename: archive.filename,
    includedVenues: archive.includedVenues,
    totalMediaCount: archive.totalMediaCount,
  }
}

export async function submitArchive(options: SubmitArchiveOptions) {
  const storagePath = await uploadToStorage(options.blob, options.filename, options.submissionType)

  return finalizeSubmission({
    storagePath,
    fileSizeBytes: options.fileSizeBytes ?? options.blob.size,
    filename: options.filename,
    projectName: options.projectName,
    submissionType: options.submissionType,
    includedVenues: options.includedVenues,
    metadata: options.metadata,
  })
}

export async function submitBuilderProject(projectName: string) {
  const submissionPackage = await createBuilderSubmissionArchive(projectName)
  const manifestPath = await uploadToStorage(
    submissionPackage.manifestBlob,
    submissionPackage.manifestFilename,
    'builder-manifest',
  )

  return finalizeSubmission({
    storagePath: manifestPath,
    fileSizeBytes: submissionPackage.fileSizeBytes,
    filename: submissionPackage.archiveFilename,
    projectName,
    submissionType: 'builder',
    includedVenues: submissionPackage.includedVenues,
    metadata: {
      ...submissionPackage.metadata,
      manifestFilename: submissionPackage.manifestFilename,
    },
  })
}

export async function submitUploadedZip(file: File, projectName: string) {
  return submitArchive({
    blob: file,
    filename: file.name,
    projectName,
    submissionType: 'zip-upload',
    includedVenues: [],
    metadata: {
      source: 'upload-page',
      mimeType: file.type || 'application/zip',
    },
  })
}
