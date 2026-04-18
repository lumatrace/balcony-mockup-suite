import {
  getSupabaseAdminClient,
  parseJsonBody,
  sendSubmissionEmail,
  uploadBucket,
} from './_shared.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed.' })
  }

  try {
    const {
      storagePath,
      fileSizeBytes,
      filename,
      projectName,
      submissionType,
      includedVenues,
      metadata,
    } = parseJsonBody(request)

    if (!storagePath || !filename || !submissionType) {
      return response.status(400).json({
        error: 'storagePath, filename, and submissionType are required.',
      })
    }

    const supabase = getSupabaseAdminClient()
    const signedUrlResult = await supabase.storage
      .from(uploadBucket)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
      return response.status(500).json({
        error: signedUrlResult.error?.message || 'Could not create the download link.',
      })
    }

    const emailResult = await sendSubmissionEmail({
      projectName,
      submissionType,
      originalFilename: filename,
      fileSizeBytes,
      includedVenues,
      downloadUrl: signedUrlResult.data.signedUrl,
    })

    const insertResult = await supabase
      .from('mockup_submissions')
      .insert({
        submission_type: submissionType,
        project_name: projectName ?? null,
        bucket_name: uploadBucket,
        storage_path: storagePath,
        original_filename: filename,
        file_size_bytes: fileSizeBytes ?? null,
        included_venues: includedVenues ?? [],
        metadata: metadata ?? {},
        email_sent: emailResult.emailSent,
      })
      .select('id')
      .single()

    if (insertResult.error) {
      return response.status(500).json({
        error: insertResult.error.message || 'The submission record could not be saved.',
      })
    }

    return response.status(200).json({
      submissionId: insertResult.data?.id ?? null,
      emailSent: emailResult.emailSent,
      warning: emailResult.warning,
    })
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not finalize the submission.',
    })
  }
}
