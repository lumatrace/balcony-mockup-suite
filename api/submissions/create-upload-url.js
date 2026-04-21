import {
  buildStoragePath,
  ensureUploadBucketSettings,
  getSupabaseAdminClient,
  parseJsonBody,
  uploadBucket,
} from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    const { filename, submissionType } = parseJsonBody(request)

    if (!filename || !submissionType) {
      return response.status(400).json({ error: 'filename and submissionType are required.' })
    }

    await ensureUploadBucketSettings()

    const storagePath = buildStoragePath(submissionType, filename)
    const supabase = getSupabaseAdminClient()
    const { data, error } = await supabase.storage.from(uploadBucket).createSignedUploadUrl(storagePath)

    if (error || !data?.token) {
      return response.status(500).json({ error: error?.message || 'Could not create a signed upload URL.' })
    }

    return response.status(200).json({
      bucket: uploadBucket,
      path: storagePath,
      token: data.token,
    })
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not prepare the upload.',
    })
  }
}
