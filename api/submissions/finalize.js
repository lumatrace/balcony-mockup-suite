import {
  getRequestOrigin,
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

    const submissionId = insertResult.data?.id ?? null
    const downloadUrl = `${getRequestOrigin(request)}/api/submissions/download?submissionId=${submissionId}`
    const emailResult = await sendSubmissionEmail({
      projectName,
      submissionType,
      originalFilename: filename,
      fileSizeBytes,
      includedVenues,
      downloadUrl,
    })

    if (submissionId) {
      await supabase
        .from('mockup_submissions')
        .update({ email_sent: emailResult.emailSent })
        .eq('id', submissionId)
    }

    return response.status(200).json({
      submissionId,
      emailSent: emailResult.emailSent,
      warning: emailResult.warning,
    })
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not finalize the submission.',
    })
  }
}
