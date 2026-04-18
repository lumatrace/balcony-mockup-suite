import JSZip from 'jszip'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadProjectSnapshot } from './projectStorage'

const builderVenueDefinitions = [
  { id: 'bar', label: 'Bar' },
  { id: 'entrance', label: 'Entrance' },
  { id: 'exit', label: 'South Wall' },
  { id: 'stage', label: 'Stage' },
] as const

type BuilderVenueId = (typeof builderVenueDefinitions)[number]['id']
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

type BuilderArchiveResult = {
  blob: Blob
  filename: string
  includedVenues: string[]
  metadata: Record<string, unknown>
}

type SubmitArchiveOptions = {
  blob: Blob
  filename: string
  projectName: string
  submissionType: SubmissionType
  includedVenues: string[]
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

async function requestSignedUpload(filename: string, submissionType: SubmissionType) {
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

async function uploadArchiveToStorage(blob: Blob, filename: string, submissionType: SubmissionType) {
  const signedUpload = await requestSignedUpload(filename, submissionType)
  const supabase = getBrowserSupabaseClient()
  const { error } = await supabase.storage
    .from(signedUpload.bucket)
    .uploadToSignedUrl(signedUpload.path, signedUpload.token, blob)

  if (error) {
    throw new Error(error.message || 'The archive could not be uploaded to storage.')
  }

  return signedUpload.path
}

function formatVenueDraftId(venueId: BuilderVenueId) {
  return `__draft__::${venueId}`
}

export async function createBuilderSubmissionArchive(projectName: string): Promise<BuilderArchiveResult> {
  const zip = new JSZip()
  const includedVenues: string[] = []
  const venueSummaries: Array<Record<string, unknown>> = []
  let totalMediaCount = 0

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

    const venueFolder = zip.folder(`venues/${sanitizeSegment(venue.label)}`)

    if (!venueFolder) {
      continue
    }

    venueFolder.file('project.json', JSON.stringify(snapshot.project, null, 2))

    snapshot.mediaRecords.forEach((mediaRecord) => {
      totalMediaCount += 1
      const safeFilename = `${mediaRecord.id}-${sanitizeSegment(mediaRecord.filename) || 'asset'}`
      venueFolder.file(`media/${safeFilename}`, mediaRecord.blob)
    })

    venueSummaries.push({
      id: venue.id,
      label: venue.label,
      layoutCount: snapshot.project.layouts.length,
      mediaCount: snapshot.mediaRecords.length,
      assignmentCount: snapshot.project.layouts.reduce(
        (count, layout) => count + layout.assignments.length,
        0,
      ),
    })
  }

  if (totalMediaCount === 0) {
    throw new Error('Add at least one image or video before submitting the mapping package.')
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
    metadata: {
      source: 'builder',
      totalMediaCount,
      venues: venueSummaries,
    },
  }
}

export async function submitArchive(options: SubmitArchiveOptions) {
  const storagePath = await uploadArchiveToStorage(options.blob, options.filename, options.submissionType)

  return finalizeSubmission({
    storagePath,
    fileSizeBytes: options.blob.size,
    filename: options.filename,
    projectName: options.projectName,
    submissionType: options.submissionType,
    includedVenues: options.includedVenues,
    metadata: options.metadata,
  })
}

export async function submitBuilderProject(projectName: string) {
  const archive = await createBuilderSubmissionArchive(projectName)

  return submitArchive({
    ...archive,
    projectName,
    submissionType: 'builder',
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
