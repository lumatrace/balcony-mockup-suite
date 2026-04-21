import JSZip from 'jszip'
import {
  formatBytes,
  getSupabaseAdminClient,
  sanitizeFileSegment,
  uploadBucket,
} from './_shared.js'

async function blobToBuffer(blobLike) {
  if (blobLike instanceof ArrayBuffer) {
    return Buffer.from(blobLike)
  }

  if (blobLike?.arrayBuffer) {
    return Buffer.from(await blobLike.arrayBuffer())
  }

  throw new Error('Unsupported file payload returned by storage.')
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    const submissionId = String(request.query.submissionId || '')

    if (!submissionId) {
      return response.status(400).json({ error: 'submissionId is required.' })
    }

    const supabase = getSupabaseAdminClient()
    const submissionResult = await supabase
      .from('mockup_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (submissionResult.error || !submissionResult.data) {
      return response.status(404).json({ error: 'Could not find that submission.' })
    }

    const submission = submissionResult.data

    if (submission.submission_type === 'zip-upload') {
      const signedUrlResult = await supabase.storage
        .from(uploadBucket)
        .createSignedUrl(submission.storage_path, 60 * 60)

      if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
        return response.status(500).json({
          error: signedUrlResult.error?.message || 'Could not create the download link.',
        })
      }

      response.setHeader('Cache-Control', 'no-store')
      return response.redirect(302, signedUrlResult.data.signedUrl)
    }

    const manifestResult = await supabase.storage.from(uploadBucket).download(submission.storage_path)

    if (manifestResult.error || !manifestResult.data) {
      return response.status(500).json({
        error: manifestResult.error?.message || 'Could not load the builder manifest.',
      })
    }

    const manifestText = Buffer.from(await manifestResult.data.arrayBuffer()).toString('utf8')
    const manifest = JSON.parse(manifestText)
    const zip = new JSZip()

    zip.file(
      'submission.json',
      JSON.stringify(
        {
          projectName: submission.project_name,
          createdAt: submission.created_at,
          includedVenues: submission.included_venues,
          fileSize: formatBytes(submission.file_size_bytes),
        },
        null,
        2,
      ),
    )

    for (const venue of manifest.venues || []) {
      const venueFolder = zip.folder(`venues/${sanitizeFileSegment(venue.label)}`)

      if (!venueFolder) {
        continue
      }

      venueFolder.file('project.json', JSON.stringify(venue.project, null, 2))

      for (const media of venue.media || []) {
        const assetResult = await supabase.storage.from(uploadBucket).download(media.storagePath)

        if (assetResult.error || !assetResult.data) {
          throw new Error(
            assetResult.error?.message || `Could not load ${media.filename || media.id} from storage.`,
          )
        }

        const mediaBuffer = await blobToBuffer(assetResult.data)
        const safeFilename =
          `${media.id}-${sanitizeFileSegment(media.filename) || 'asset'}`.replace(/--+/g, '-')

        venueFolder.file(`media/${safeFilename}`, mediaBuffer)
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

    response.setHeader('Content-Type', 'application/zip')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizeFileSegment(submission.original_filename) || 'submission.zip'}"`,
    )
    response.setHeader('Cache-Control', 'no-store')

    return response.status(200).send(zipBuffer)
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not prepare the submission download.',
    })
  }
}
